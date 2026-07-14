import { db } from "@/db";
import { User, workouts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function fetchRecentWorkoutsAsMDTable(existingUser: User): Promise<string> {

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
          notes.length ? notes.join(", ") : "-",
        ].join(" | ");
      }),
    )
    .join("\n");
    
  return workoutsPrompt
  }