import { z } from "zod";

export const exerciseCatalogCreateInputSchema = z.object({
  nombreNormalizado: z.preprocess(
    (value) => String(value ?? "").trim().toLowerCase(),
    z.string().min(1),
  ),
  grupoMuscular: z.preprocess(
    (value) => String(value ?? "").trim(),
    z.string().min(1),
  ),
  actividad: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || "musculacion";
    },
    z.string().min(1),
  ).default("musculacion"),
});

export type ExerciseCatalogCreateInput = z.infer<
  typeof exerciseCatalogCreateInputSchema
>;
