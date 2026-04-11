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
      return new NextResponse("Rate limit exceeded. Please wait 1h.", {
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

  // Reduce payload size: fetch only last 10 workouts and trim exercise fields
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
  const promptText = `You are a senior fitness coach generating the NEXT workout.

Use ONLY the provided USER DATA. This is a production app → hallucinations are not allowed.

#CORE RULES

##DATA & CONTINUITY
- Do not invent injuries, preferences, experience or history.
- You MAY introduce new exercises if justified.
- Use "Previous state" as coach memory and keep continuity.
- The goal text is the main source of truth.

##LAST WORKOUT LOGIC
- Find the MOST RECENT workout date in "Last workouts".
- Infer the main muscle groups trained that day.
- DO NOT train those muscle groups today.

##EXERCISE SELECTION
The workout MUST mix:
• Known exercises (from history) → continuity & progression  
• New exercises → variation & progression

Requirements:
- At least 1 known exercise
- At least 1 new exercise
- Total exercises: 4–6
- New exercises must be realistic, safe for lumbar L4-L5 and fit a commercial gym.
- New exercises must be a progression or variation of movement patterns found in history (push, pull, squat, hinge, lunge, core, shoulders, arms).

##PROGRESSION
- Apply small progressive overload when possible.
- If a known exercise exists in history, use its latest reps/series as baseline.
- Do not reduce volume unless fatigue_level is "alto".

## EXCLUSION LOGIC (CRITICAL)
1. Get 'fecha' from the last item in 'Last workouts'.
2. Identify muscles: [List them].
3. If 'fecha' is within 24 hours of "Today", the new 'grupo' MUST NOT be any of the identified muscles.

## SAFETY & GOAL LOGIC
- **Scan:** Extract injuries (L4-L5, etc.) and targets (Flexiones, etc.) from [Goal].
- **Filter:** If injury exists, **BAN** axial/high-impact loads (No Barbell Squats/DL for Lumbar). **USE** supported/neutral alternatives (Machines/Isometrics).
- **Target:** Include 1 exercise directly progressing the user's specific performance goal.
- **Justify:** [rutina.justificacion] MUST explain why the plan is safe for the detected limitations.
- **Strict:** Safety > Routine. Replace any exercise that risks a listed limitation.

##OUTPUT RULES
- STRICT JSON ONLY
- Spanish only
- series and reps must be numbers
- No extra text
- rutina.ejercicios MUST contain 4 to 6 items.

#USER DATA:
- [Goal (written in spanish) - start]: ${latestObjective?.content ?? existingUser.objetivo ?? "General fitness"} [Goal - end]
- [Experience - start]: ${existingUser.experiencia || "Unknown"} [Experience - end]
- [Previous state - start]: ${latestState?.content ?? null} [Previous state - end]
- [Last workouts (written in spanish mostly and in JSON format ${JSON.stringify(typeof recentWorkouts)}) - start]: ${JSON.stringify(recentWorkouts)} [Last workouts - end]
##OUTPUT (STRICT JSON ONLY, NO TEXT OUTSIDE JSON):
{
  "resumen": "string", // brief summary of the plan and rationale
  "rutina": {
    "grupo": "string", //muscle group or focus area
    "justificacion": "string", //brief reason for this focus based on user data
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
    "recommendation_next": "string",
    "user_traning_evolution_analysis": "string", //brief analysis of the user's training evolution based on SAFETY & GOAL LOGIC, the training history evolution.
  },
  
}

#IMPORTANT:
- Response MUST be valid JSON
- No markdown
- No explanations
- No extra text
- All text must be in Spanish
`;
  if (process.env.NODE_ENV === "development") {
    console.log("Prompt:", promptText);
  }
  try {
    const { text } = await generateText({
      model: openrouter("openrouter/free"),
      prompt: promptText,
      //temperature: 0,        // 🔴 biggest change
      topP: 0.1,             // restrict token choices
      topK: 20,              // optional but helpful
      frequencyPenalty: 0,
      presencePenalty: 0,
    });

    await db.insert(aiLogs).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      requestPayload: trimPayload(promptText, MAX_REQUEST_PAYLOAD),
      responsePayload: trimPayload(text, MAX_RESPONSE_PAYLOAD),
    });

    // Try to extract a JSON training_state from the AI output
    const parsed = parseAIResponse(text);

     // Persist AI memory
    if (parsed)
      try {
        await db.insert(aiMemories).values({
          id: crypto.randomUUID(),
          userId: existingUser.id,
          contenido: JSON.stringify(parsed),
        });
      } catch (e) {
        console.warn("Failed to persist AI memory", e);
      }

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
      if (process.env.NODE_ENV === "development") console.log("Parsed AI response:", JSON.stringify(parsed));
      return NextResponse.json(parsed);
    } 
    return new NextResponse("AI response could not be parsed", { status: 422 });
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