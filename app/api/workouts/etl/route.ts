import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { saveWorkoutsWithExercises } from "@/lib/workouts-utils";
import { exerciseMuscleGroupSchema } from "@/lib/muscleClassifier";

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
                      series: z.number().int().default(1).describe("Number of sets performed"),
                      repeticiones: z.number().int().default(0).describe("Number of repetitions per set performed"),
                      duracionSegundos: z.number().int().default(0).describe("Duration in seconds per set performed"),
                      peso: z.number().int().default(0).describe("Weight used per set performed"),
                      grupoMuscular: exerciseMuscleGroupSchema.describe("Muscle group targeted by the exercise"),
                      notas: z.string().optional().nullable().describe("Optional notes for the exercise"),
                    }),
                  )
                  .min(1, "Each workout must have at least one exercise"), // Validation: Ensure exercises exist
              }),
            )
            .min(1, "No workouts were found in the text"), // Validation: Ensure at least one workout exists
        }),
      }),
      prompt: `Reference Date: ${referenceDate}\nYou are a Gym Workout Extractor from user gym exercise descriptions. Extract all workouts from the user's description. User description: "${prompt}"`,
    });
    const value = result.output
    const insertedData = await saveWorkoutsWithExercises( existingUser.id, value.workouts);
    return NextResponse.json({ success: true, data: insertedData });
  
  } catch (error) {
    console.error("ETL Generation failed", error);
    return new NextResponse("ETL AI Parsing failed", { status: 500 });
  }
}
