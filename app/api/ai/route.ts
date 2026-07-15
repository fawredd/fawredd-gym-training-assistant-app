import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import {
  users,
  aiMemories,
  trainingStates,
} from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { kv } from "@vercel/kv";
import { parseAIResponse, TrainingState } from "@/lib/ai-response";
import { mapTrainingStateToDB, getLatestTrainingStateAsMDTable, generateNewTrainingState } from "@/lib/training-state-utils";
import { format } from "date-fns";
import { fetchRecentWorkoutsAsMDTable } from "@/lib/workouts-utils";
import { fetchLatestTrainingObjective } from "@/lib/user-objective-utils";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST() {
  
  // verify user authentication
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  //verify user exists in our DB
  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser)
    return new NextResponse("User profile not found", { status: 404 });

  if (existingUser.tipoDeUsuario > 1) { // if user is admin, we skip rate limiting
  // Rate Limiting logic using Vercel KV
  try {
    const rateLimitKey = `rl_ai_${existingUser.id}`;
    const lastGenerated = await kv.get<number>(rateLimitKey);
    const twelveHoursInMs = 1 * 60 * 60 * 1000; //Modify to 1hr for testing
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


  //consulto el ultimo estado de entrenamiento generado por la IA
  const latestState = await getLatestTrainingStateAsMDTable(existingUser);

  //consulto los ultimos entrenamientos del usuario en formato tabla markdown para pasarselo al modelo
  const workoutsPrompt = await fetchRecentWorkoutsAsMDTable(existingUser);

  //consulto el ultimo objetivo de entrenamiento del usuario
  const latestObjective = await fetchLatestTrainingObjective(existingUser);

  const today = format(new Date(), "yyyy-MM-dd");

  // Keep prompt concise to reduce token usage; instruct AI to be brief and output only required JSON block
  const systemPrompt = `You are a senior fitness coach generating the NEXT workout.

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
- Total routine time should be around 60-90 minutes.
- New exercises must be realistic and fit a commercial gym.
- New exercises must be a progression or variation of movement patterns found in history (push, pull, squat, hinge, lunge, core, shoulders, arms, legs, core).

##PROGRESSION
- Apply small progressive overload when possible.
- If a known exercise exists in history, use its latest reps/series as baseline.

## EXCLUSION LOGIC (CRITICAL)
1. Get 'fecha' from the last item in 'Last workouts'.
2. Identify muscles: [List them].
3. If 'fecha' is within 24 hours of "Today", the new 'grupo' MUST NOT be any of the main identified muscles to introduce.

## SAFETY & GOAL LOGIC
- **Scan:** Extract injuries (L4-L5, etc.) and targets (Flexiones, etc.) from [Goal].
- **Filter:** If injury exists, **BAN** axial/high-impact loads (No Barbell Squats/DL for Lumbar). **USE** supported/neutral alternatives (Machines/Isometrics).
- **Target:** Include 1 exercise directly progressing the user's specific performance goal.
- **Justify:** [rutina.justificacion] MUST explain why the plan is safe for the detected limitations.
- **Strict:** Safety > Routine. Replace any exercise that risks a listed limitation.

##OUTPUT RULES
- STRICT JSON ONLY
- Spanish only
- series,reps and weight must be numbers
- No extra text
- if last workout is today, tell the user the exercises are for the next day of training.

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
        "reps": number, // if it's a time-based exercise, use 1 and put time in "duración"
        "duracion": number, // in seconds, if applicable
        "peso": number, // if not applicable, set to 0
      }
    ]
  },
}

#IMPORTANT:
- Response MUST be valid JSON
- No markdown
- No explanations
- No extra text
- All text must be in Spanish
`;

  const userPrompt = `
#USER DATA:
- [Today date]: ${today}.
- [Goal (written in spanish) - start]: ${latestObjective?.content ?? existingUser.objetivo ?? "General fitness"} [Goal - end]
- [Previous state - start]: ${latestState} [Previous state - end]
- [Last workouts - (exercises are written in spanish mostly or english.) - start]
Format:
Date | Exercise | Sets x Reps | Weight | Muscle Group | Notes
${workoutsPrompt}
[Last workouts - end]
`;

  if (process.env.NODE_ENV === "development") {
    console.log("System prompt:", systemPrompt);
    console.log("User prompt:", userPrompt);
  }
  try {
    let text = "";
    const result = streamText({
      //model: google("gemini-3.5-flash"),
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

    // Try to extract a JSON training_state from the AI output
    const parsed = parseAIResponse(text);

    // Persist AI memory
    if (parsed){
      console.log("--- Parsed AI response OK ---");
      if (process.env.NODE_ENV === "development")
        console.log("Parsed AI response:", JSON.stringify(parsed));
        console.log("-----------------------------")
      try {
        console.log("--- Persisting AI memory for user ---");
        await db.insert(aiMemories).values({
          id: crypto.randomUUID(),
          userId: existingUser.id,
          contenido: JSON.stringify(parsed),
        });
        console.log("- AI memory persisted successfully -");
      } catch (e) {
        console.warn("- Failed to persist AI memory -", e);
      }
      
      try{
        console.log("--- Generating new training state ---");
        const newTrainingState = await generateNewTrainingState(existingUser);
        if (!newTrainingState) {
          console.error("- No training state generated -");
          return new NextResponse("Failed to generate new training state", {
            status: 500,
          });
        }
        console.log("- New training state generated successfully -");
      }catch(e){
        console.error("- Failed to generate new training state -", e);
        return new NextResponse("Failed to generate new training state", {
          status: 500,
        });
      }
      console.log("- Returning AI routine response -");
      return NextResponse.json(parsed);
    }
    
    console.log("--- Failed to parse AI response:", text);
    return new NextResponse(`AI response could not be parsed.`, { status: 422 });

  } catch (error) {
    console.error("--- AI Generation failed", error);
    return new NextResponse("AI Generation Error", { status: 500 });
  }
}
