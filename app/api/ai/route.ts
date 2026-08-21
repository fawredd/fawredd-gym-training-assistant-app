import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import { users, aiMemories } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { kv } from "@vercel/kv";
import { parseAIResponse } from "@/lib/ai-response";
import {
  MAX_PROMPT_SEGMENT_LENGTH,
  MAX_ROUTINE_GROUP_LENGTH,
  MAX_TEXT_LENGTH,
  type AIRoutineResponse,
} from "@/lib/schemas/ai-routine";
import {
  getLatestTrainingStateAsMDTable,
  generateNewTrainingState,
} from "@/lib/training-state-utils";
import { format } from "date-fns";
import { fetchRecentWorkoutsAsMDTable } from "@/lib/workouts-utils";
import { fetchLatestTrainingObjective } from "@/lib/user-objective-utils";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const PROMPT_INJECTION_PATTERN =
  /(ignore(?:\s+(?:all|the))?\s+instructions|ignore previous instructions|ignore prior context|override(?:\s+the)?\s*(?:system|developer)?\s*prompt|system prompt|developer prompt|reveal hidden|bypass|pretend to be|act as|forget everything|<\s*(?:system|developer)\s*>)/i;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizePromptSegment(
  input: string | null | undefined,
  maxLength: number,
): string {
  const normalized = String(input ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength);
}

function detectPromptInjection(value: string): boolean {
  return PROMPT_INJECTION_PATTERN.test(value);
}

function wrapPromptTag(tagName: string, value: string): string {
  return `<${tagName}>${escapeXml(value)}</${tagName}>`;
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

function sanitizeAIResponse(parsed: AIRoutineResponse): AIRoutineResponse {
  const ejercicios = parsed.rutina.ejercicios.map((ejercicio) => ({
    nombre: ejercicio.nombre.slice(0, 120).trim() || "Ejercicio",
    series: clampInteger(ejercicio.series, 1, 100),
    reps: clampInteger(Number(ejercicio.reps), 0, 500),
    duracion: clampInteger(Number(ejercicio.duracion), 0, 3600),
    peso: clampFloat(Number(ejercicio.peso), 0, 500),
  }));

  return {
    resumen: parsed.resumen.slice(0, MAX_TEXT_LENGTH).trim() || "Rutina segura",
    rutina: {
      grupo:
        parsed.rutina.grupo.slice(0, MAX_ROUTINE_GROUP_LENGTH).trim() ||
        "General",
      justificacion:
        parsed.rutina.justificacion.slice(0, MAX_TEXT_LENGTH).trim() ||
        "Plan seguro",
      ejercicios,
    },
  };
}

function isValidAIResponse(data: unknown): data is AIRoutineResponse {
  if (data === null || typeof data !== "object") {
    return false;
  }

  return "resumen" in data && "rutina" in data;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser) {
    return new NextResponse("User profile not found", { status: 404 });
  }

  const incomingIdempotencyKey =
    request.headers.get("Idempotency-Key") ??
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");

  if (!incomingIdempotencyKey?.trim()) {
    return new NextResponse("Missing Idempotency-Key header", { status: 400 });
  }

  const normalizedKey = incomingIdempotencyKey.trim();
  const idempotencyKey = `ai:idempotency:${existingUser.id}:${normalizedKey}`;
  const processingKey = `${idempotencyKey}:processing`;

  const cachedResponse = await kv.get<string>(idempotencyKey);
  if (cachedResponse) {
    try {
      return NextResponse.json(JSON.parse(cachedResponse));
    } catch {
      // Ignore invalid cached payload and continue with generation.
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
        return NextResponse.json(JSON.parse(retryCachedResponse));
      } catch {
        // Ignore invalid cached payload and continue below.
      }
    }

    return new NextResponse(
      "A generation is already in progress for this request.",
      { status: 409 },
    );
  }

  try {
    if (existingUser.tipoDeUsuario > 1) {
      try {
        const rateLimitKey = `rl_ai_${existingUser.id}`;
        const lastGenerated = await kv.get<number>(rateLimitKey);
        const twelveHoursInMs = 1 * 60 * 60 * 1000;

        if (
          lastGenerated &&
          Date.now() - lastGenerated < twelveHoursInMs &&
          process.env.NODE_ENV === "production"
        ) {
          return new NextResponse("Rate limit exceeded. Please wait.", {
            status: 429,
          });
        }

        await kv.set(rateLimitKey, Date.now(), { px: twelveHoursInMs });
      } catch (e) {
        console.warn(
          "KV Rate Limiter failed, skipping strict limit for dev/local.",
          e,
        );
      }
    }

    const latestState = await getLatestTrainingStateAsMDTable(existingUser);
    const workoutsPrompt = await fetchRecentWorkoutsAsMDTable(existingUser);
    const latestObjective = await fetchLatestTrainingObjective(existingUser);
    const today = format(new Date(), "yyyy-MM-dd");

    const goalText = sanitizePromptSegment(
      latestObjective?.content ?? existingUser.objetivo ?? "General fitness",
      MAX_PROMPT_SEGMENT_LENGTH,
    );
    const previousStateText = sanitizePromptSegment(latestState, 4000);
    const workoutsText = sanitizePromptSegment(workoutsPrompt, 4000);

    const suspiciousObjective = detectPromptInjection(goalText);
    const safeGoalText = suspiciousObjective ? "General fitness" : goalText;

const systemPrompt = `You are a senior fitness coach generating the NEXT workout routine.
Use ONLY provided user data. Hallucinations are forbidden.

LANGUAGE CONTEXT:
- Input fields (<goal>, <previous_state>, and workout notes inside <last_workouts>) are written in Spanish.
- ALL generated text fields in the JSON output MUST be strictly in Spanish.

RULES:
1. Target 7-8 exercises (min 7, max 9, 60-90 min total). Balance movement patterns (push, pull, squat/hinge, unilateral leg, core).
2. Continuity & Variety: Combine known exercises (using latest weight/reps as baseline) with suitable commercial gym variations. Always include 1 exercise directly advancing the user's specific performance goal.
3. Muscle Exclusion (Strict): Check <last_workouts>. Identify muscle groups trained on the most recent date. If trained within 24 hours of <today_date>, DO NOT train those muscle groups today. If the last workout was today, clarify that the routine is for the next session.
4. Safety First: Scan <goal> for injuries or physical limitations. Absolutely BAN axial/high-impact loading on injured areas (e.g., no heavy barbell squats/deadlifts for lumbar issues). Use safe alternatives and explain safety choices in the output justification.
5. Output numeric values as numbers (series, reps, weight, duracion).`;

const userPrompt = `<user_data>
<today_date>${today}</today_date>
<goal>${safeGoalText}</goal>
<previous_state>${previousStateText}</previous_state>
<last_workouts>
Date | Exercise | Sets x Reps | Weight | Muscle Group | Notes
${workoutsText}
</last_workouts>
</user_data>`;

    if (process.env.NODE_ENV === "development") {
      console.log("System prompt:", systemPrompt);
      console.log("User prompt:", userPrompt);
    }

    let text = "";
    const result = streamText({
      model: google("gemini-3.1-flash-lite"),
      system: systemPrompt,
      prompt: userPrompt,
      topP: 0.1,
      topK: 20,
      maxRetries: 0,
    });

    try {
      for await (const chunk of result.textStream) {
        text += chunk;
      }
    } catch (err) {
      console.error("Error leyendo stream", err);
    }

    const parsed = parseAIResponse(text);

    if (!parsed || !isValidAIResponse(parsed)) {
      console.log("--- Failed to parse AI response:", text);
      return new NextResponse("AI response could not be parsed.", {
        status: 422,
      });
    }

    const sanitizedParsed = sanitizeAIResponse(parsed);

    try {
      console.log("--- Persisting AI memory for user ---");
      await db.insert(aiMemories).values({
        id: crypto.randomUUID(),
        userId: existingUser.id,
        contenido: JSON.stringify(sanitizedParsed),
      });
      console.log("- AI memory persisted successfully -");
    } catch (e) {
      console.warn("- Failed to persist AI memory -", e);
    }

    try {
      console.log("--- Generating new training state ---");
      const newTrainingState = await generateNewTrainingState(existingUser);
      if (!newTrainingState) {
        throw new Error("No training state generated");
      }
      console.log("- New training state generated successfully -");
    } catch (e) {
      console.error("- Failed to generate new training state -", e);
      return new NextResponse("Failed to generate new training state", {
        status: 500,
      });
    }

    await kv.set(idempotencyKey, JSON.stringify(sanitizedParsed), {
      px: 10 * 60 * 1000,
    });

    console.log("- Returning AI routine response -");
    return NextResponse.json(sanitizedParsed);
  } catch (error) {
    console.error("--- AI Generation failed ---", error);
    return new NextResponse("AI Generation Error", { status: 500 });
  } finally {
    await kv.del(processingKey);
  }
}
