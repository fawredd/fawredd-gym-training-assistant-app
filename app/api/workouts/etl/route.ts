import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { saveWorkoutsWithExercises } from "@/lib/workouts-utils";
import {
  MAX_EXERCISE_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  type WorkoutInput,
} from "@/lib/schemas/workout";
import { exerciseMuscleGroupSchema } from "@/lib/muscleClassifier";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const PROMPT_INJECTION_PATTERN =
  /(ignore(?:\s+(?:all|the))?\s+instructions|ignore previous instructions|ignore prior context|override(?:\s+the)?\s*(?:system|developer)?\s*prompt|system prompt|developer prompt|reveal hidden|bypass|pretend to be|act as|forget everything|<\s*(?:system|developer)\s*>)/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizePromptText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") {
    throw new Error("Prompt required");
  }

  const normalized = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("Prompt required");
  }

  if (normalized.length > maxLength) {
    throw new Error("Prompt is too long.");
  }

  if (PROMPT_INJECTION_PATTERN.test(normalized)) {
    throw new Error("Suspicious prompt content detected.");
  }

  return normalized;
}

function sanitizeReferenceDate(value: unknown): string {
  if (typeof value !== "string" || !DATE_REGEX.test(value.trim())) {
    throw new Error("Reference date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${value.trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Reference date must be a valid calendar date.");
  }

  return value.trim();
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

function clampFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function sanitizeWorkoutOutput(workouts: unknown[]): WorkoutInput[] {
  return workouts.map((workout) => {
    const workoutObject = workout as {
      date?: string;
      exercises?: Array<{
        nombre?: string;
        series?: number;
        repeticiones?: number;
        duracionSegundos?: number;
        peso?: number;
        grupoMuscular?: string;
        notas?: string | null;
      }>;
    };

    const safeExercises = (workoutObject.exercises ?? []).map((exercise) => {
      const grupoMuscular = String(exercise.grupoMuscular ?? "").trim();
      const grupoMuscularValid =
        exerciseMuscleGroupSchema.safeParse(grupoMuscular);
      const sanitizedGrupoMuscular = grupoMuscularValid.success
        ? grupoMuscular
        : "piernas";

      return {
        nombre:
          String(exercise.nombre ?? "")
            .slice(0, MAX_EXERCISE_NAME_LENGTH)
            .trim() || "ejercicio",
        series: clampInteger(Number(exercise.series ?? 1), 1, 100),
        repeticiones: clampInteger(Number(exercise.repeticiones ?? 0), 0, 500),
        peso: clampFloat(Number(exercise.peso ?? 0), 0, 500),
        duracionSegundos: clampInteger(
          Number(exercise.duracionSegundos ?? 0),
          0,
          3600,
        ),
        notas:
          String(exercise.notas ?? "")
            .slice(0, MAX_NOTES_LENGTH)
            .trim() || null,
        grupoMuscular: sanitizedGrupoMuscular,
      };
    });

    return {
      date: String(workoutObject.date ?? "").trim(),
      exercises: safeExercises,
    };
  });
}

function wrapPromptTag(tagName: string, value: string): string {
  return `<${tagName}>${escapeXml(value)}</${tagName}>`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser)
    return new NextResponse("User profile not found", { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const { prompt, referenceDate } = body as {
    prompt?: unknown;
    referenceDate?: unknown;
  };

  try {
    const safePrompt = sanitizePromptText(prompt, MAX_PROMPT_LENGTH);
    const safeReferenceDate = sanitizeReferenceDate(referenceDate);

    const result = await generateText({
      model: openrouter("openrouter/free"),
      output: Output.object({
        schema: z.object({
          workouts: z
            .array(
              z.object({
                date: z
                  .string()
                  .regex(/^\d{4}-\d{2}-\d{2}$/)
                  .describe("ISO Date string (YYYY-MM-DD)."),
                exercises: z
                  .array(
                    z.object({
                      nombre: z
                        .string()
                        .min(1)
                        .describe("Name of the exercise"),
                      series: z
                        .number()
                        .int()
                        .default(1)
                        .describe("Number of sets performed"),
                      repeticiones: z
                        .number()
                        .int()
                        .default(0)
                        .describe("Number of repetitions per set performed"),
                      duracionSegundos: z
                        .number()
                        .int()
                        .default(0)
                        .describe("Duration in seconds per set performed"),
                      peso: z
                        .number()
                        .int()
                        .default(0)
                        .describe("Weight used per set performed"),
                      grupoMuscular: exerciseMuscleGroupSchema.describe(
                        "Muscle group targeted by the exercise",
                      ),
                      notas: z
                        .string()
                        .optional()
                        .nullable()
                        .describe("Optional notes for the exercise"),
                    }),
                  )
                  .min(1, "Each workout must have at least one exercise"),
              }),
            )
            .min(1, "No workouts were found in the text"),
        }),
      }),
      prompt: `Reference Date: ${wrapPromptTag("reference_date", safeReferenceDate)}\nYou are a Gym Workout Extractor from user gym exercise descriptions. Extract all workouts from the user's description. User description: ${wrapPromptTag("user_description", safePrompt)}`,
    });

    const value = result.output;
    const sanitizedOutput = sanitizeWorkoutOutput(value.workouts);
    const insertedData = await saveWorkoutsWithExercises(
      existingUser.id,
      sanitizedOutput,
    );

    return NextResponse.json({ success: true, data: insertedData });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Prompt required") ||
        error.message.includes("Prompt is too long") ||
        error.message.includes("Suspicious prompt content") ||
        error.message.includes("Reference date"))
    ) {
      return new NextResponse(error.message, { status: 400 });
    }

    console.error("ETL Generation failed", error);
    return new NextResponse("ETL AI Parsing failed", { status: 500 });
  }
}
