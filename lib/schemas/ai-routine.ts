import { z } from "zod";

export const MAX_PROMPT_SEGMENT_LENGTH = 2000;
export const MAX_ROUTINE_GROUP_LENGTH = 80;
export const MAX_TEXT_LENGTH = 250;

export const trainingStateSchema = z.object({
  priority_goals: z.string(),
  secondary_goals: z.string(),
  progression_focus: z.string(),
  weak_areas: z.string(),
  recovery_notes: z.string(),
  weekly_strategy: z.string(),
  recommendation_next: z.string(),
  user_traning_evolution_analysis: z.string(),
});

export const aiRoutineExerciseSchema = z.object({
  nombre: z.string(),
  series: z.number(),
  reps: z.union([z.number(), z.string()]),
  duracion: z.union([z.number(), z.string()]),
  peso: z.union([z.number(), z.string()]),
});

export const aiRoutineResponseSchema = z.object({
  resumen: z.string(),
  rutina: z.object({
    grupo: z.string(),
    justificacion: z.string(),
    ejercicios: z.array(aiRoutineExerciseSchema),
  }),
});

export type TrainingState = z.infer<typeof trainingStateSchema>;
export type AIRoutineResponse = z.infer<typeof aiRoutineResponseSchema>;
