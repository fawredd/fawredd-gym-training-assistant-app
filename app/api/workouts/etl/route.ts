import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { kv } from "@vercel/kv";
import { google } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { saveWorkoutsWithExercises } from "@/lib/workouts-utils";
import {
  MAX_EXERCISE_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  type WorkoutInput,
} from "@/lib/schemas/workout";
import { exerciseMuscleGroupSchema } from "@/lib/muscleClassifier";

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

  const incomingIdempotencyKey =
    req.headers.get("Idempotency-Key") ??
    req.headers.get("idempotency-key") ??
    req.headers.get("x-idempotency-key");

  if (!incomingIdempotencyKey?.trim()) {
    return new NextResponse("Missing Idempotency-Key header", { status: 400 });
  }

  const normalizedKey = incomingIdempotencyKey.trim();
  const idempotencyKey = `etl:workouts:${existingUser.id}:${normalizedKey}`;
  const processingKey = `${idempotencyKey}:processing`;

  const cachedResponse = await kv.get<string>(idempotencyKey);
  if (cachedResponse) {
    try {
      return NextResponse.json(JSON.parse(cachedResponse), { status: 200 });
    } catch {
      // Ignore invalid cached payload and continue.
    }
  }

  const hasProcessingLock = await kv.set(processingKey, "1", {
    nx: true,
    px: 60_000,
  });

  if (!hasProcessingLock) {
    const retryCachedResponse = await kv.get<string>(idempotencyKey);
    if (retryCachedResponse) {
      try {
        return NextResponse.json(JSON.parse(retryCachedResponse), {
          status: 200,
        });
      } catch {
        // Ignore invalid cached payload and continue below.
      }
    }

    return new NextResponse(
      "A workout ETL generation is already in progress for this request.",
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await kv.del(processingKey);
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const { prompt, referenceDate } = body as {
    prompt?: unknown;
    referenceDate?: unknown;
  };

  try {
    const safePrompt = sanitizePromptText(prompt, MAX_PROMPT_LENGTH);
    const safeReferenceDate = sanitizeReferenceDate(referenceDate);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `# ETL user prompt: User description: ${wrapPromptTag("user_description", safePrompt)}`,
      );
    }

    const result = await generateText({
      model: google("gemini-3.5-flash-lite"),
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
                        .describe("Exact name of the exercise"),

                      series: z
                        .number()
                        .int()
                        .min(1)
                        .describe(
                          "Number of sets explicitly stated in the user input",
                        ),

                      repeticiones: z
                        .number()
                        .int()
                        .nullable()
                        .describe(
                          "Number of repetitions per set. REQUIRED. Extract the exact number stated by the user. Use null only when repetitions are not provided or the exercise is duration-based.",
                        ),

                      duracionSegundos: z
                        .number()
                        .int()
                        .nullable()
                        .describe(
                          "Duration in seconds per set. REQUIRED. Convert stated duration to seconds. Use null only when duration is not provided.",
                        ),

                      peso: z
                        .number()
                        .nullable()
                        .describe(
                          "Weight used per set, in kg. REQUIRED. Extract the exact numeric weight stated by the user. Use null only when no weight is provided.",
                        ),

                      grupoMuscular: z
                        .string()
                        .min(1)
                        .describe(
                          "Primary muscle group targeted by the exercise",
                        ),

                      notas: z
                        .string()
                        .nullable()
                        .describe(
                          "Optional note explicitly stated by the user, such as FPE 9. Use null when there is no note.",
                        ),
                    }),
                  )
                  .min(1, "Each workout must have at least one exercise"),
              }),
            )
            .min(1, "No workouts were found in the text"),
        }),
      }),
      system: `You are a Gym Workout Extractor from user gym exercise descriptions.
Extract all workouts from the user's description. 
Preserve every explicitly stated series, repetition, duration, weight, muscle group, and note exactly.
Never replace a stated repetition count with 0. 
Use 0 only when repetitions are not provided or the exercise is duration-based. 
An example of user input: 
"
• Press de pecho en máquina: 3x12 @ 40kg FPE 8 ( Exercise: Chest Press Machine, 3 sets of 12 reps at 40kg, note: FPE 8 )
• Flexiones de brazos (rodillas apoyadas): 3x12 FPE 7( Exercise: Knee Push-ups, 3 sets of 12 reps, note: FPE 7 )
• Press de hombros en máquina: 3x12 @ 15kg ( Exercise: Shoulder Press Machine, 3 sets of 12 reps at 15kg )
• Elevaciones laterales con mancuernas: 3x12 @ 5kg ( Exercise: Lateral Raises, 3 sets of 12 reps at 5kg )
• Tríceps en polea: 3x12 @ 40kg ( Exercise: Tricep Pulldown, 3 sets of 12 reps at 40kg )
• Pallof press: 3x12 @ 5kg ( Exercise: Pallof Press, 3 sets of 12 reps at 5kg )
• Plancha abdominal isométrica: 3x60s FPE 6 ( Exercise: Isometric Plank, 3 sets of 60 seconds with note: FPE 6 )
• Bird dog: 3x12 ( Exercise: Bird Dog, 3 sets of 12 reps )
"
`,
      prompt: `${wrapPromptTag("reference_date", safeReferenceDate)}${wrapPromptTag("user_description", safePrompt)}`,
    });
    if (process.env.NODE_ENV === "development") {
      console.log("ETL AI provider output:", JSON.stringify(result.output));
    }
    const value = result.output;
    const sanitizedOutput = sanitizeWorkoutOutput(value.workouts);
    const insertedData = await saveWorkoutsWithExercises(
      existingUser.id,
      sanitizedOutput,
    );

    const successPayload = { success: true, data: insertedData };
    await kv.set(idempotencyKey, JSON.stringify(successPayload), {
      px: 10 * 60 * 1000,
    });

    return NextResponse.json(successPayload);
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

    if (NoObjectGeneratedError.isInstance(error)) {
      if (process.env.NODE_ENV === "development") {
        console.error("ETL AI structured-output diagnostics", {
          text: error.text,
          cause: error.cause,
          finishReason: error.finishReason,
          response: error.response,
          usage: error.usage,
        });
      } else {
        console.error("ETL AI provider returned invalid structured output", {
          finishReason: error.finishReason,
        });
      }

      return new NextResponse(
        "The AI provider did not return a valid workout structure.",
        { status: 502 },
      );
    }

    console.error("ETL Generation failed", error);
    return new NextResponse("ETL AI Parsing failed", { status: 500 });
  } finally {
    await kv.del(processingKey);
  }
}
