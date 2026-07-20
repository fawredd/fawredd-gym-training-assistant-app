import { TrainingState as TrainingStateDbMap } from "./ai-response";
import { db } from "@/db";
import {
  User,
  NewTrainingState,
  trainingStates,
  trainingObjectives,
  workouts,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { fetchLatestTrainingObjective } from "./user-objective-utils";
import { fetchRecentWorkoutsAsMDTable } from "./workouts-utils";
import { generateText, Output } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";

/**
 * Maps the AI training state representation to the database schema.
 *
 * This adapter converts the snake_case properties returned by the AI layer
 * into the camelCase fields expected by the `trainingStates` table.
 *
 * It performs only property mapping and contains no business logic.
 */
export function mapTrainingStateToDB(ts: TrainingStateDbMap) {
  return {
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

/**
 * Retrieves the most recently persisted training state for the given user.
 *
 * The latest record is determined using the `createdAt` timestamp in
 * descending order.
 *
 * This helper centralizes the query so the rest of the module can reuse
 * the same implementation without duplicating database access logic.
 *
 * Returns:
 * - The latest training state if one exists.
 * - `undefined` if the user has never generated a training state.
 */
async function fetchLatestTrainingState(existingUser: User) {
  return db.query.trainingStates.findFirst({
    where: eq(trainingStates.userId, existingUser.id),
    orderBy: [desc(trainingStates.createdAt)],
  });
}

/**
 * Converts a persisted training state into a Markdown document that is
 * injected into the LLM prompt as "coach memory".
 *
 * The generated Markdown provides condensed historical context so the model
 * can continue the user's progression without re-analyzing the complete
 * workout history every time.
 *
 * This function is pure: it performs no database access and has no side
 * effects.
 */
type TrainingStateRow = Exclude<
  Awaited<ReturnType<typeof fetchLatestTrainingState>>,
  undefined
>;

function trainingStateToMarkdown(latestState: TrainingStateRow) {
  return `
# 🏋️‍♂️ ÚLTIMO ESTADO DE ENTRENAMIENTO REGISTRADO
| **Fecha de Registro** | ${format(latestState.createdAt, "yyyy-MM-dd")} |

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
}

/**
 * Ensures the user's persisted training state is synchronized with the
 * latest available information.
 *
 * A regeneration is triggered when:
 * - no training state exists yet,
 * - the user's training objective was updated after the current state, or
 * - a newer workout has been recorded since the current state was generated.
 *
 * Database queries are executed in parallel to minimize latency.
 *
 * Returns the latest valid training state, generating and persisting a new
 * one when necessary.
 *
 * This function intentionally contains the freshness logic so the rest of
 * the module does not need to know when regeneration is required.
 */
async function ensureTrainingStateIsFresh(existingUser: User) {
  const [latestState, latestObjective, latestWorkout] = await Promise.all([
    fetchLatestTrainingState(existingUser),
    fetchLatestTrainingObjective(existingUser),
    db.query.workouts.findFirst({
      where: eq(workouts.userId, existingUser.id),
      orderBy: [desc(workouts.fecha)],
    }),
  ]);

  const isOutdated =
    !latestState ||
    (latestObjective?.updatedAt &&
      latestState.createdAt < latestObjective.updatedAt) ||
    (latestWorkout?.fecha &&
      latestState.createdAt < new Date(latestWorkout.fecha));

  if (process.env.NODE_ENV === "development") {
    console.log({
      latestState: latestState?.createdAt,
      latestObjective: latestObjective?.updatedAt,
      latestWorkoutFecha: latestWorkout?.fecha,
      latestWorkoutCreatedAt: latestWorkout?.createdAt,
      isOutdated,
    });

    if (!isOutdated) {
      return latestState;
    }
    const newTrainingState = await generateNewTrainingState(existingUser);
    return fetchLatestTrainingState(existingUser);
  }
}

/**
 * Returns the latest valid training state formatted as Markdown.
 *
 * Before building the Markdown representation, this function guarantees that
 * the persisted state is up-to-date by delegating the validation to
 * `ensureTrainingStateIsFresh()`.
 *
 * The resulting Markdown is intended to be embedded directly into LLM prompts
 * as long-term coaching memory.
 */
export async function getLatestTrainingStateAsMDTable(
  existingUser: User,
): Promise<string> {
  const latestState = await ensureTrainingStateIsFresh(existingUser);
  if (!latestState) {
    return "No se encontró un estado de entrenamiento registrado.";
  }
  return trainingStateToMarkdown(latestState);
}

/**
 * Generates a new strategic training state using the LLM.
 *
 * The generated state is a compressed "coach memory" that summarizes the
 * user's long-term progression, priorities, recovery status and coaching
 * strategy. It is intentionally much smaller than the complete workout
 * history to reduce prompt size in future AI calls.
 *
 * Workflow:
 * 1. Load the latest objective, previous training state and recent workouts.
 * 2. Build the AI prompt.
 * 3. Generate a structured object using the AI SDK.
 * 4. Persist the generated state (update existing record or insert a new one).
 * 5. Return the generated state.
 *
 * The persistence step is treated independently from generation; failures
 * while writing to the database are logged without masking successful AI
 * generation.
 */
export async function generateNewTrainingState(
  existingUser: User,
): Promise<Omit<NewTrainingState, "id" | "userId" | "createdAt">> {
  const today = format(new Date(), "yyyy-MM-dd");

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

  const [latestObjective, latestState, workoutsPrompt] = await Promise.all([
    fetchLatestTrainingObjective(existingUser),
    fetchLatestTrainingState(existingUser),
    fetchRecentWorkoutsAsMDTable(existingUser),
  ]);

  const objectiveContent =
    latestObjective?.content ??
    "El usuario no tiene un objetivo de entrenamiento registrado. Se sugiere un objetivo general de fitness y bienestar.";

  const previousStateMarkdown = latestState
    ? trainingStateToMarkdown(latestState)
    : "No se encontró un estado de entrenamiento registrado.";

  const userPrompt = `
  #USER DATA:
  - [Today date]: ${today}.
  - [Goal (written in spanish) - start]: ${objectiveContent} [Goal - end]
  - [Previous state - start]: ${previousStateMarkdown} [Previous state - end]
  - [Last workouts - (exercises are written in spanish mostly or english.) - start]
  Format:
  Date | Exercise | Sets x Reps | Weight | Muscle Group | Notes
  ${workoutsPrompt}
  [Last workouts - end]
  `;

  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-lite"),
      output: Output.object({
        schema: z.object({
          priorityGoals: z
            .string()
            .describe(
              "The user's primary goals and objectives for this training period (e.g., squat strength, fat loss, muscle hypertrophy).",
            ),
          secondaryGoals: z
            .string()
            .describe(
              "Secondary or supporting goals that complement the main objective (e.g., improving ankle mobility, consistency, conditioning).",
            ),
          progressionFocus: z
            .string()
            .describe(
              "The specific area or method the user should focus on to progress their loads or volume (e.g., linear progressive overload, increasing repetitions).",
            ),
          weakAreas: z
            .string()
            .describe(
              "Physical, technical, or performance-related weak points detected that require special attention or modification.",
            ),
          recoveryNotes: z
            .string()
            .describe(
              "Guidelines regarding rest, sleep quality, stress management, or active recovery protocols.",
            ),
          weeklyStrategy: z
            .string()
            .describe(
              "Overall strategy and distribution for the upcoming week (e.g., training frequency, key effort days, split structure).",
            ),
          recommendationNext: z
            .string()
            .describe(
              "The immediate actionable advice or specific recommendation the user should execute in their very next workout session.",
            ),
          evolutionAnalysis: z
            .string()
            .describe(
              "A brief analysis of the user's progress and trend compared to their previous training states.",
            ),
        }),
      }),
      system: systemPrompt,
      prompt: userPrompt,
      topP: 0.1,
      topK: 20,
      maxRetries: 0,
    });

    const newTrainingState = await result.output;

    try {
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
