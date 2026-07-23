import { z } from "zod";

export const MAX_OBJECTIVE_CONTENT_LENGTH = 2000;

export const objectiveContentSchema = z.object({
  content: z.string().min(1).max(MAX_OBJECTIVE_CONTENT_LENGTH),
});

export type ObjectiveContentInput = z.infer<typeof objectiveContentSchema>;
