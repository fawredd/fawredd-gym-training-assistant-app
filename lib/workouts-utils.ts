"use server";
import { db } from "@/db";
import {
  exerciseCatalog,
  User,
  workoutExercises,
  workouts,
  ExerciseCatalogRow,
  users,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { classifyExercise } from "./muscleClassifier";
import { type NewWorkoutInput, type WorkoutInput } from "@/lib/schemas/workout";
import { generateNewTrainingState } from "./training-state-utils";

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

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!existingUser)
    throw new Error("Saving workout failed: User profile not found");

  const preparedWorkouts: Array<{
    workout: WorkoutInput;
    exercises: Array<{
      exercise: WorkoutInput["exercises"][number];
      nombreNormalizado: string;
      catalogEntry: ExerciseCatalogRow | undefined;
      classifiedExercise: Awaited<ReturnType<typeof classifyExercise>> | null;
    }>;
  }> = [];
  for (const workout of workoutsData) {
    const exercises = [];

    for (const exercise of workout.exercises) {
      const nombreNormalizado = exercise.nombre.trim().toLowerCase();
      const catalogEntry = await db.query.exerciseCatalog.findFirst({
        where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
      });

      exercises.push({
        exercise,
        nombreNormalizado,
        catalogEntry,
        classifiedExercise: catalogEntry
          ? null
          : await classifyExercise(exercise.nombre),
      });
    }

    preparedWorkouts.push({ workout, exercises });
  }

  // Usamos una transacción para asegurar consistencia
  await db.transaction(async (tx) => {
    for (const preparedWorkout of preparedWorkouts) {
      const { workout: w, exercises } = preparedWorkout;
      const workoutId = crypto.randomUUID();

      // 1. Crear el entrenamiento principal y asegurar que exista antes de insertar hijos
      const [insertedWorkout] = await tx
        .insert(workouts)
        .values({
          id: workoutId,
          userId,
          fecha: w.date,
        })
        .returning({ id: workouts.id });

      if (!insertedWorkout?.id) {
        throw new Error("Failed to create workout parent row");
      }

      const persistedWorkoutId = insertedWorkout.id;

      if (w.exercises && w.exercises.length > 0) {
        // 2. Catalog entries and workout exercises are written in one transaction.
        const rows = [];

        for (const preparedExercise of exercises) {
          const { exercise: ex, nombreNormalizado } = preparedExercise;
          let catalogEntry = preparedExercise.catalogEntry;

          if (!catalogEntry) {
            const classifiedExercise = preparedExercise.classifiedExercise;
            if (!classifiedExercise) {
              throw new Error("Exercise classification was not prepared");
            }

            const catalogId = crypto.randomUUID();

            const [inserted] = await tx
              .insert(exerciseCatalog)
              .values({
                id: catalogId,
                nombreNormalizado,
                grupoMuscular: classifiedExercise.grupoMuscular,
                actividad: classifiedExercise.actividad,
              })
              .onConflictDoNothing({
                target: exerciseCatalog.nombreNormalizado,
              })
              .returning();

            catalogEntry =
              inserted ??
              (await tx.query.exerciseCatalog.findFirst({
                where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
              }));

            if (!catalogEntry) {
              throw new Error("Failed to create or load exercise catalog row");
            }
          }

          rows.push({
            id: crypto.randomUUID(),
            workoutId: persistedWorkoutId,
            exerciseCatalogId: catalogEntry.id,
            nombre: catalogEntry.nombreNormalizado,
            series: ex.series ?? 1,
            repeticiones: ex.repeticiones ?? 0,
            peso: ex.peso ?? 0,
            duracionSegundos: ex.duracionSegundos ?? 0,
            grupoMuscular: catalogEntry.grupoMuscular,
            notas: ex.notas ?? null,
          });
        }

        await tx.insert(workoutExercises).values(rows);
      }

      insertedWorkouts.push({
        workoutId: persistedWorkoutId,
        date: w.date,
        numExercises: w.exercises.length,
      });
    }
  });

  try {
    await generateNewTrainingState(existingUser);
  } catch (error) {
    console.warn("Failed to refresh training state after workout save", error);
  }

  return insertedWorkouts;
}

export async function fetchExerciseCatalog(): Promise<ExerciseCatalogRow[]> {
  const catalog = await db.query.exerciseCatalog.findMany({
    orderBy: [desc(exerciseCatalog.nombreNormalizado)],
  });
  return catalog;
}
