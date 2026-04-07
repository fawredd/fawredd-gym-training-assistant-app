import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import {
  workouts,
  users,
  aiMemories,
  aiLogs,
  trainingObjectives,
  trainingStates,
} from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { kv } from "@vercel/kv";
import { parseAIResponse, TrainingState } from "@/lib/ai-response";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Trim helpers to limit stored token sizes
const MAX_REQUEST_PAYLOAD = 2000;
const MAX_RESPONSE_PAYLOAD = 4000;
const MAX_MEMORY_CONTENT = 2000;
function trimPayload(s: string | null | undefined, max: number) {
  if (!s) return s ?? null;
  return s.length > max ? s.slice(0, max) : s;
}


export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser)
    return new NextResponse("User profile not found", { status: 404 });

  // Rate Limiting logic using Vercel KV
  try {
    const rateLimitKey = `rl_ai_${existingUser.id}`;
    const lastGenerated = await kv.get<number>(rateLimitKey);
    const twelveHoursInMs = 1 * 60 * 60 * 1000; //Modify to 1hr for testing
    if (lastGenerated && Date.now() - lastGenerated < twelveHoursInMs && process.env.NODE_ENV === "production") {
      return new NextResponse("Rate limit exceeded. Please wait 12h.", {
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

  // Reduce payload size: fetch only last 3 workouts and trim exercise fields
  const recentWorkoutsRaw = await db.query.workouts.findMany({
    where: eq(workouts.userId, existingUser.id),
    orderBy: [desc(workouts.fecha)],
    limit: 10,
    with: { exercises: true },
  });

  const recentWorkouts = recentWorkoutsRaw.map((w) => ({
    id: w.id,
    fecha: w.fecha,
    exercises: w.exercises.map((e) => ({
      nombre: e.nombre,
      series: e.series,
      repeticiones: e.repeticiones,
      peso: e.peso,
    })),
  }));

  // Fetch latest training objective and previous training state
  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, existingUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });

  const latestState = await db.query.trainingStates.findFirst({
    where: eq(trainingStates.userId, existingUser.id),
    orderBy: [desc(trainingStates.createdAt)],
  });

  // Keep prompt concise to reduce token usage; instruct AI to be brief and output only required JSON block
  const promptText = `
You are a senior fitness coach.

Generate a DAILY workout plan based on user data.

RULES:
- Avoid generic advice
- Consider recovery and balance
- Be concise

USER DATA:
- Goal: ${latestObjective?.content ?? existingUser.objetivo ?? "General fitness"}
- Experience: ${existingUser.experiencia || "Unknown"}
- Previous state: ${latestState?.content ?? null}
- Last workouts: ${JSON.stringify(recentWorkouts)}

OUTPUT (STRICT JSON ONLY, NO TEXT OUTSIDE JSON):

{
  "resumen": "string",
  "rutina": {
    "grupo": "string", //grupo muscular
    "justificacion": "string",
    "ejercicios": [
      {
        "nombre": "string",
        "series": number,
        "reps": number
      }
    ]
  },
  "training_state": {
    "last_focus": "string",
    "weekly_balance": "balanceado | sobrecargado | subentrenado",
    "fatigue_level": "bajo | medio | alto",
    "recommendation_next": "string"
  }
}

IMPORTANT:
- Response MUST be valid JSON
- No markdown
- No explanations
- No extra text
- All text must be in Spanish
`;

  try {
    const { text } = await generateText({
      model: openrouter("openrouter/free"),
      prompt: promptText,
    });

    await db.insert(aiLogs).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      requestPayload: trimPayload(promptText, promptText.length),
      responsePayload: trimPayload(text, text.length),
    });

    // Persist AI memory
    await db.insert(aiMemories).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      contenido: trimPayload(text, text.length)!,
    });

    // Try to extract a JSON training_state from the AI output

    const parsed = parseAIResponse(text);

    const trainingState: TrainingState | null = parsed?.training_state ?? null;

    const stateContent =
      trimPayload(
        trainingState
          ? JSON.stringify(trainingState)
          : JSON.stringify({ summary: text.slice(0, 400) }),
        MAX_MEMORY_CONTENT,
      ) || JSON.stringify({ summary: "" });

    // -------
    try {
      await db.insert(trainingStates).values({
        id: crypto.randomUUID(),
        userId: existingUser.id,
        content: stateContent,
      });
    } catch (e) {
      console.warn("Failed to persist training state", e);
    }
    if (parsed) {
     return NextResponse.json(parsed);
}
  } catch (error) {
    console.error("AI Generation failed", error);

    // Log the failure
    await db.insert(aiLogs).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      requestPayload: trimPayload(promptText, MAX_REQUEST_PAYLOAD),
      responsePayload: trimPayload(
        `ERROR: ${error instanceof Error ? error.message : "Unknown API Error"}`,
        MAX_RESPONSE_PAYLOAD,
      ),
    });

    return new NextResponse("AI Generation Error", { status: 500 });
  }
}
