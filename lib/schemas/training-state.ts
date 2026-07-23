import { z } from "zod";

export const trainingStateGenerationOutputSchema = z.object({
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
});

export type TrainingStateGenerationOutput = z.infer<
  typeof trainingStateGenerationOutputSchema
>;
