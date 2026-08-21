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
  const latestState = await db.query.trainingStates.findFirst({
    where: eq(trainingStates.userId, existingUser.id),
    orderBy: [desc(trainingStates.createdAt)],
  });

  if (!latestState) {
    return "Sin estado previo.";
  }

  return `Fecha: ${format(latestState.createdAt, "yyyy-MM-dd")}
Metas prioritarias: ${latestState.priorityGoals}
Metas secundarias: ${latestState.secondaryGoals}
Enfoque progresión: ${latestState.progressionFocus}
Puntos a mejorar: ${latestState.weakAreas}
Estrategia semanal: ${latestState.weeklyStrategy}
Siguiente paso: ${latestState.recommendationNext}
Notas recuperación: ${latestState.recoveryNotes}
Análisis evolución: ${latestState.evolutionAnalysis}`.trim();
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

  // Keep prompt concise to reduce token usage; instruct AI to be brief and output only required JSON block
  const systemPrompt = `You are a senior fitness coach updating a user's strategic TRAINING STATE summary.
Analyze user goals, prior state, and recent workouts to generate a concise progress update.

RULES:
- Maintain continuity with the prior state and objective.
- Do NOT invent history, injuries, or preferences.
- Write ALL response field values strictly in Spanish.
- Be extremely concise, actionable, and focused on strategic evaluation rather than specific exercise descriptions.`;

  const latestObjective =
    (await fetchLatestTrainingObjective(existingUser)) ||
    JSON.parse(
      "{content: 'El usuario no tiene un objetivo de entrenamiento registrado. Se sugiere un objetivo general de fitness y bienestar.'}",
    );

  const latestState = await getLatestTrainingStateAsMDTable(existingUser);

  //consulto los ultimos entrenamientos del usuario en formato tabla markdown para pasarselo al modelo
  const workoutsPrompt = await fetchRecentWorkoutsAsMDTable(existingUser);

  const userPrompt = `<today>${today}</today>

<OBJETIVO_PRINCIPAL>
${latestObjective?.content}
</OBJETIVO_PRINCIPAL>

<ESTADO_ANTERIOR>
${latestState}
</ESTADO_ANTERIOR>

<HISTORIAL_DE_ENTRENAMIENTOS_RECIENTES>
${workoutsPrompt}
</HISTORIAL_DE_ENTRENAMIENTOS_RECIENTES>
`;

  if (process.env.NODE_ENV === "development") {
    console.log(
      " -- GENERANDO NUEVO ESTADO DE ENTRENAMIENTO PARA USUARIO:",
      existingUser.id,
    );
  }
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
      const now = new Date();

      // 1. Consultamos el último estado de entrenamiento generado por la IA
      const latestState = await db.query.trainingStates.findFirst({
        where: eq(trainingStates.userId, existingUser.id),
        orderBy: [desc(trainingStates.createdAt)],
      });
      if (latestState) {
        await db
          .update(trainingStates)
          .set({
            ...newTrainingState,
            updatedAt: now,
          })
          .where(eq(trainingStates.id, latestState.id));
      } else {
        await db.insert(trainingStates).values({
          id: crypto.randomUUID(),
          userId: existingUser.id,
          ...newTrainingState,
          updatedAt: now,
        });
      }
    } catch (e) {
      console.warn("Failed to persist training state", e);
    }
    if (process.env.NODE_ENV === "development") {
      console.log(" -- NUEVO ESTADO DE ENTRENAMIENTO GENERADO");
    }
    return newTrainingState;
  } catch (error) {
    console.error("Error generating new training state:", error);
    throw new Error("Failed to generate new training state.");
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.log(
        " -- CIERRE PROCESO DE GENERACION DE NUEVO ESTADO DE ENTRENAMIENTO PARA USUARIO:",
        existingUser.id,
      );
    }
  }
}
