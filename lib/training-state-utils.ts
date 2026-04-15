import { TrainingState } from "./ai-response";

export function mapTrainingStateToDB(ts: TrainingState) {
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