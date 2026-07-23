import { z } from "zod";

export const MAX_PROMPT_LENGTH = 5000;
export const MAX_EXERCISE_NAME_LENGTH = 120;
export const MAX_NOTES_LENGTH = 400;

export const workoutExerciseInputSchema = z.object({
  nombre: z.string().min(1),
  series: z.number().int().optional().nullable(),
  repeticiones: z.number().int().optional().nullable(),
  peso: z.number().int().optional().nullable(),
  duracionSegundos: z.number().int().optional().nullable(),
  grupoMuscular: z.string().optional(),
  notas: z.string().optional().nullable(),
});

export const workoutCreateInputSchema = z.object({
  date: z.string().min(1),
  exercises: z.array(workoutExerciseInputSchema),
});

export const workoutUpdateInputSchema = z.object({
  date: z.string().min(1).optional(),
  exercises: z.array(workoutExerciseInputSchema).optional(),
});

export const savedWorkoutResultSchema = z.object({
  workoutId: z.string(),
  date: z.string(),
  numExercises: z.number().int(),
});

export type WorkoutExerciseInput = z.infer<typeof workoutExerciseInputSchema>;
export type WorkoutInput = z.infer<typeof workoutCreateInputSchema>;
export type WorkoutUpdateInput = z.infer<typeof workoutUpdateInputSchema>;
export type NewWorkoutInput = z.infer<typeof savedWorkoutResultSchema>;
