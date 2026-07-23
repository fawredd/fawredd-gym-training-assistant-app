"use server";
import { db } from "@/db";
import {
  exerciseCatalog,
  User,
  workoutExercises,
  workouts,
  ExerciseCatalogRow,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { classifyExercise } from "./muscleClassifier";
import { type NewWorkoutInput, type WorkoutInput } from "@/lib/schemas/workout";

export async function fetchRecentWorkoutsAsMDTable(
  existingUser: User,
): Promise<string> {
  // Reduce payload size: fetch only last 10 workouts and trim exercise fields
  const recentWorkoutsRaw = await db.query.workouts.findMany({
    where: eq(workouts.userId, existingUser.id),
    orderBy: [desc(workouts.fecha)],
    limit: 10,
    with: { exercises: true },
  });

  const recentWorkouts = recentWorkoutsRaw.map((w, i) => ({
    id: `workout-${i}`, // avoid exposing real IDs
    fecha: w.fecha,
    exercises: w.exercises.map((e) => ({
      grupoMuscular: e.grupoMuscular,
      nombre: e.nombre,
      series: e.series,
      repeticiones: e.repeticiones,
      peso: e.peso,
      duracion: e.duracionSegundos,
      notas: e.notas,
    })),
  }));

  const workoutsPrompt = recentWorkouts
    .flatMap((workout) =>
      workout.exercises.map((exercise) => {
        const notes: string[] = [];

        // Extraer notas de textos entre paréntesis
        const match = exercise.nombre.match(/\((.*?)\)/g);
        if (match) {
          notes.push(...match.map((m) => m.replace(/[()]/g, "").trim()));
        }

        // Nombre limpio sin paréntesis
        const exerciseName = exercise.nombre
          .replace(/\(.*?\)/g, "")
          .replace(/\s+/g, " ")
          .trim();

        return [
          workout.fecha,
          exerciseName,
          `${exercise.series ?? 0}x${exercise.repeticiones ?? 0}`,
          `${exercise.peso ?? 0}kg`,
          exercise.grupoMuscular,
          notes.length ? notes.join(", ") : (exercise.notas ?? "-"),
        ].join(" | ");
      }),
    )
    .join("\n");

  return workoutsPrompt;
}

export async function saveWorkoutsWithExercises(
  userId: string,
  workoutsData: WorkoutInput[],
) {
  const insertedWorkouts: NewWorkoutInput[] = [];

  // Usamos una transacción para asegurar consistencia
  await db.transaction(async (tx) => {
    for (const w of workoutsData) {
      const workoutId = crypto.randomUUID();

      // 1. Crear el entrenamiento principal
      await tx.insert(workouts).values({
        id: workoutId,
        userId,
        fecha: w.date,
      });

      if (w.exercises && w.exercises.length > 0) {
        // 2. Procesar, catalogar e insertar cada ejercicio
        const rows = await Promise.all(
          w.exercises.map(async (ex) => {
            const nombreNormalizado = ex.nombre.trim().toLowerCase();

            // Buscar en el catálogo
            let catalogEntry = await tx.query.exerciseCatalog.findFirst({
              where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
            });

            // Si no existe, clasificar e insertar en catálogo
            if (!catalogEntry) {
              const clasifiedExercise = await classifyExercise(ex.nombre);

              const catalogId = crypto.randomUUID();

              const [inserted] = await tx
                .insert(exerciseCatalog)
                .values({
                  id: catalogId,
                  nombreNormalizado,
                  grupoMuscular: clasifiedExercise.grupoMuscular,
                  actividad: clasifiedExercise.actividad,
                })
                .returning();

              catalogEntry = inserted;
            }

            // Retornar objeto listo para workout_exercises
            return {
              id: crypto.randomUUID(),
              workoutId,
              exerciseCatalogId: catalogEntry.id,
              nombre: catalogEntry.nombreNormalizado,
              series: ex.series ?? 1,
              repeticiones: ex.repeticiones ?? 0,
              peso: ex.peso ?? 0,
              duracionSegundos: ex.duracionSegundos ?? 0,
              grupoMuscular: catalogEntry.grupoMuscular,
              notas: ex.notas ?? null, // Nota del usuario no se almacena en esta versión
            };
          }),
        );

        await tx.insert(workoutExercises).values(rows);
      }

      insertedWorkouts.push({
        workoutId,
        date: w.date,
        numExercises: w.exercises.length,
      });
    }
  });

  return insertedWorkouts;
}

export async function fetchExerciseCatalog(): Promise<ExerciseCatalogRow[]> {
  const catalog = await db.query.exerciseCatalog.findMany({
    orderBy: [desc(exerciseCatalog.nombreNormalizado)],
  });
  return catalog;
}
