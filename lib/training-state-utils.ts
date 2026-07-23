import { TrainingState as TrainingStateDbMap } from "./ai-response";
import { db } from "@/db";
import { User, NewTrainingState, trainingStates, trainingObjectives, workouts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { fetchLatestTrainingObjective } from "./user-objective-utils";
import { fetchRecentWorkoutsAsMDTable } from "./workouts-utils";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { differenceInDays } from "date-fns";
import { trainingStateGenerationOutputSchema } from "@/lib/schemas/training-state";

export function mapTrainingStateToDB(ts: TrainingStateDbMap) {
  return {
    //lastWorkoutId: ts.last_workout_id,
    priorityGoals: ts.priority_goals,
    secondaryGoals: ts.secondary_goals,
    progressionFocus: ts.progression_focus,
    weakAreas: ts.weak_areas,
    recoveryNotes: ts.recovery_notes,
    weeklyStrategy: ts.weekly_strategy,
    recommendationNext: ts.recommendation_next,
    evolutionAnalysis: ts.user_traning_evolution_analysis,
  };
}

export async function getLatestTrainingStateAsMDTable(
  existingUser: User,
): Promise<string> {
  // 1. Consultamos el último estado de entrenamiento generado por la IA
  const latestState = await db.query.trainingStates.findFirst({
    where: eq(trainingStates.userId, existingUser.id),
    orderBy: [desc(trainingStates.createdAt)],
  });

  // 2. Manejo de caso undefined
  if (!latestState) {
    return "No se encontró un estado de entrenamiento registrado.";
  }
  //Verify if training state is updated related to the latest objective and workouts dates
  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, existingUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });
  const latestWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.userId, existingUser.id),
    orderBy: [desc(workouts.createdAt)],
  });
  if (
    latestObjective && 
    latestWorkout && 
    (
    differenceInDays(latestObjective?.updatedAt,latestState.createdAt)>0 ||
    differenceInDays(latestWorkout?.createdAt,latestState.createdAt)>0 
    )){
    const newTrainingState = await generateNewTrainingState(existingUser);
    if (!newTrainingState) {
      return "Training state outdated. Failed to generate new training state";
    }
  }

  // 3. Construimos el string en formato Markdown optimizado para el prompt de la IA
  const markdownPrompt = `
# 🏋️‍♂️ ÚLTIMO ESTADO DE ENTRENAMIENTO REGISTRADO
| **Fecha de Registro** | ${format(latestState.createdAt,"yyyy-MM-dd")} |

## 🎯 Objetivos y Enfoque
* **Metas Prioritarias:** ${latestState.priorityGoals}
* **Metas Secundarias:** ${latestState.secondaryGoals}
* **Enfoque de Progresión:** ${latestState.progressionFocus}
* **Áreas Débiles / Puntos a Mejorar:** ${latestState.weakAreas}

## 📋 Estrategia y Planificación
* **Estrategia Semanal:** 
  > ${latestState.weeklyStrategy.replace(/\n/g, "\n  > ")}
* **Recomendación Inmediata / Siguiente Paso:** ${latestState.recommendationNext}

## 📝 Notas de Recuperación y Evolución
* **Notas de Recuperación:** ${latestState.recoveryNotes}
* **Análisis de Evolución:** 
  > ${latestState.evolutionAnalysis.replace(/\n/g, "\n  > ")}

---
*(Fin del estado de entrenamiento anterior. Utiliza esta información como contexto para la nueva respuesta o actualización).*
`.trim();

  return markdownPrompt;
}

export async function generateNewTrainingState(
  existingUser: User,
): Promise<Omit<NewTrainingState, "id" | "userId" | "createdAt">> {
  const today = format(new Date(), "yyyy-MM-dd");

  // Keep prompt concise to reduce token usage; instruct AI to be brief and output only required JSON block
  const systemPrompt = `You are a senior fitness coach generating a TRAINING STATE (COACH MEMORY SUMMARY).
  
  Use ONLY the provided USER DATA. This is a production app → hallucinations are not allowed.
  
  #CORE COACH RULES
  
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
  - Known exercises (from history) → continuity & progression  
  - New exercises → variation & progression
  
  ##Requirements:
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
  - No extra text
  
  # TRAINING STATE (COACH MEMORY SUMMARY)
  
  training_state is a compressed strategic summary of the user's training evolution.
  It does NOT describe the last workout. It describes the coaching strategy.
  
  It exists to avoid re-analysing the full workout history on every prompt.
  
  It must consider the following user data:
  - Goal
  - Previous state if exists
  - Workouts history loaded in user prompt
  
  Fields:
  - priority_goals → What performance goals are currently prioritized.
  - secondary_goals → Secondary physique or health goals.
  - progression_focus → Exercises or abilities currently being progressed.
  - weak_areas → Muscle groups or capacities lagging behind.
  - recovery_notes → Fatigue, recovery or scheduling insights.
  - weekly_strategy → How the week is being balanced.
  - recommendation_next → Strategic suggestion for the next workout.
  - user_traning_evolution_analysis → Short longitudinal coaching insight.
  
  ##OUTPUT (STRICT JSON ONLY, NO TEXT OUTSIDE JSON):
  {
    "training_state": {
      "priority_goals": "string",
      "secondary_goals": "string",
      "progression_focus": "string",
      "weak_areas": "string",
      "recovery_notes": "string",
      "weekly_strategy": "string",
      "recommendation_next": "string",
      "user_traning_evolution_analysis": "string",
    }
  }
  
  #IMPORTANT:
  - Response MUST be valid JSON
  - No markdown
  - No explanations
  - No extra text
  - All text must be in Spanish
  `;

  const latestObjective =
    (await fetchLatestTrainingObjective(existingUser)) ||
    JSON.parse(
      "{content: 'El usuario no tiene un objetivo de entrenamiento registrado. Se sugiere un objetivo general de fitness y bienestar.'}",
    );

  const latestState = await getLatestTrainingStateAsMDTable(existingUser);

  //consulto los ultimos entrenamientos del usuario en formato tabla markdown para pasarselo al modelo
  const workoutsPrompt = await fetchRecentWorkoutsAsMDTable(existingUser);

  const userPrompt = `
  #USER DATA:
  - [Today date]: ${today}.
  - [Goal (written in spanish) - start]: ${latestObjective?.content} [Goal - end]
  - [Previous state - start]: ${latestState} [Previous state - end]
  - [Last workouts - (exercises are written in spanish mostly or english.) - start]
  Format:
  Date | Exercise | Sets x Reps | Weight | Muscle Group | Notes
  ${workoutsPrompt}
  [Last workouts - end]
  `;
  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-lite"),
      //model: openrouter("openrouter/free"),
      output: Output.object({
        schema: trainingStateGenerationOutputSchema,
      }),
      system: systemPrompt,
      prompt: userPrompt,
      topP: 0.1,
      topK: 20,
      maxRetries: 0,
    });

    const newTrainingState = result.output;

    try {
      // 1. Consultamos el último estado de entrenamiento generado por la IA
      const latestState = await db.query.trainingStates.findFirst({
        where: eq(trainingStates.userId, existingUser.id),
        orderBy: [desc(trainingStates.createdAt)],
      });
      if (latestState) {
        await db
          .update(trainingStates)
          .set(newTrainingState)
          .where(eq(trainingStates.id, latestState.id));
      } else {
        await db.insert(trainingStates).values({
          id: crypto.randomUUID(),
          userId: existingUser.id,
          ...newTrainingState,
        });
      }
    } catch (e) {
      console.warn("Failed to persist training state", e);
    }
    return newTrainingState;
  } catch (error) {
    console.error("Error generating new training state:", error);
    throw new Error("Failed to generate new training state.");
  }
}
