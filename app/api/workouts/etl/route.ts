import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../../db";
import {
  workouts,
  workoutExercises,
  users,
  aiLogs,
} from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { muscleGroupSchema } from "@/lib/muscleClassifier";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser)
    return new NextResponse("User profile not found", { status: 404 });

  const body = await req.json();
  const { prompt, referenceDate } = body;
  if (!prompt || typeof prompt !== "string")
    return new NextResponse("Prompt required", { status: 400 });
  if (!referenceDate)
    return new NextResponse("Reference Date required", { status: 400 });

  try {
    const result = await generateText({
      model: openrouter("openrouter/free"),
      // The 'output' property now encapsulates your schema logic
      output: Output.object({
        schema: z.object({
          workouts: z
            .array(
              z.object({
                date: z
                  .string()
                  .regex(/^\d{4}-\d{2}-\d{2}$/) // Strict ISO format validation
                  .describe("ISO Date string (YYYY-MM-DD)."),
                exercises: z
                  .array(
                    z.object({
                      nombre: z
                        .string()
                        .min(1)
                        .describe("Name of the exercise"),
                      series: z.number().int().default(1),
                      repeticiones: z.number().int().default(0),
                      peso: z.number().int().default(0),
                      duracionSegundos: z.number().int().default(0),
                      grupoMuscular: muscleGroupSchema,
                    }),
                  )
                  .min(1, "Each workout must have at least one exercise"), // Validation: Ensure exercises exist
              }),
            )
            .min(1, "No workouts were found in the text"), // Validation: Ensure at least one workout exists
        }),
      }),
      prompt: `Reference Date (Hoy): ${referenceDate}\nExtract all workouts from the user's description. User description: "${prompt}"`,
    });
    const value = result.output
    // Insert into database
    const insertedData = [];
    for (const w of value.workouts) {
      const workoutId = crypto.randomUUID();
      await db.insert(workouts).values({
        id: workoutId,
        userId: existingUser.id,
        fecha: w.date,
      });

      if (w.exercises.length > 0) {
        const exRows = w.exercises.map((ex) => ({
          id: crypto.randomUUID(),
          workoutId,
          nombre: ex.nombre,
          series: ex.series,
          repeticiones: ex.repeticiones,
          peso: ex.peso,
          duracionSegundos: ex.duracionSegundos,
          grupoMuscular: ex.grupoMuscular,
        }));
        await db.insert(workoutExercises).values(exRows);
      }
      insertedData.push({
        workoutId,
        date: w.date,
        numExercises: w.exercises.length,
      });
    }

    // Log AI Interaction
    await db.insert(aiLogs).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      requestPayload: prompt,
      responsePayload: JSON.stringify(value),
    });

    return NextResponse.json({ success: true, data: insertedData });
  } catch (error) {
    console.error("ETL Generation failed", error);
    return new NextResponse("ETL AI Parsing failed", { status: 500 });
  }
}
