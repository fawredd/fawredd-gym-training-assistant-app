import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  workouts,
  workoutExercises,
  users,
  exerciseCatalog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { classifyExercise } from "@/lib/muscleClassifier";
import { generateNewTrainingState } from "@/lib/training-state-utils";
import { ApiResponse } from "@/types/api";

interface Exercise {
  nombre: string;
  series: number;
  repeticiones?: number;
  peso?: number;
  duracionSegundos?: number;
  grupoMuscular?: string;
  notas?: string | null;
}

type CreateWorkoutBody = {
  date: string; // "YYYY-MM-DD"
  exercises: Exercise[];
};

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  // 1. Verify user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  // 2. Verify workout belongs to user
  const workoutTarget = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
  });

  if (!workoutTarget)
    return new NextResponse("Workout not found or access denied", {
      status: 403,
    });

  try {
    await db.delete(workouts).where(eq(workouts.id, id));
    /* const newTrainingState = await generateNewTrainingState(existingUser);
    if (!newTrainingState) {
      console.error(
        "Failed to generate new training state after workout deletion",
      );
    } */
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting workout", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  const workoutTarget = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
  });
  if (!workoutTarget)
    return new NextResponse("Workout not found or access denied", {
      status: 403,
    });

  const body: CreateWorkoutBody = await req.json();
  const { date:fecha, exercises:ejercicios } = body;

  try {
    // Usamos una transacción para asegurar que la actualización sea atómica
    await db.transaction(async (tx) => {
      // 1. Actualizamos la fecha del workout si viene en el body
      if (fecha) {
        await tx
          .update(workouts)
          .set({ fecha, updatedAt: new Date() })
          .where(eq(workouts.id, id));
      }

      // 2. Si se envía la lista de ejercicios, reemplazamos los anteriores
      if (ejercicios) {
        // Eliminamos los ejercicios viejos vinculados a este workout
        await tx
          .delete(workoutExercises)
          .where(eq(workoutExercises.workoutId, id));

        if (ejercicios.length > 0) {
          // Procesamos, catalogamos y mapeamos los nuevos ejercicios
          const rows = await Promise.all(
            ejercicios.map(async (ex) => {
              const nombreNormalizado = ex.nombre.trim().toLowerCase();

              // Buscamos si ya existe en el catálogo (usando 'tx')
              let catalogEntry = await tx.query.exerciseCatalog.findFirst({
                where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
              });
              console.log("-- Ejercicio a buscar en el catalogo:",nombreNormalizado)
              console.log("-- consulto si existe el ejercicio en el catalogo:",catalogEntry)
              // Si no existe, lo clasificamos e insertamos en el catálogo
              if (!catalogEntry) {
                console.log("-- no existe, lo clasifico e inserto en el catalogo")
                const clasifiedExercise = await classifyExercise(ex.nombre);
                const catalogId = crypto.randomUUID();

                const [inserted] = await tx
                  .insert(exerciseCatalog)
                  .values({
                    id: catalogId,
                    nombreNormalizado: clasifiedExercise.nombreEstandarizado,
                    grupoMuscular: clasifiedExercise.grupoMuscular,
                    actividad: clasifiedExercise.actividad,
                  })
                  .returning();

                catalogEntry = inserted;
              }

              // Retornamos el registro listo para asociar al workout
              return {
                id: crypto.randomUUID(),
                workoutId: id, // El id del workout que estamos editando
                exerciseCatalogId: catalogEntry.id,
                nombre: catalogEntry.nombreNormalizado, // Guardamos el nombre normalizado
                series: ex.series,
                repeticiones: ex.repeticiones ?? 0,
                peso: ex.peso ?? 0,
                duracionSegundos: ex.duracionSegundos ?? 0,
                grupoMuscular: catalogEntry.grupoMuscular,
                notas: ex.notas ?? null,
              };
            }),
          );
          console.log("-- Ejercicios nuevos a insertar en workoutExercises:", rows);
          // Insertamos los nuevos ejercicios actualizados
          await tx.insert(workoutExercises).values(rows);
        }
      }
    });
    /* const newTrainingState = await generateNewTrainingState(existingUser);
    if (!newTrainingState) {
      console.error(
        "Failed to generate new training state after workout update",
      );
    } */
    return new NextResponse(null,{ status: 204 });
  } catch (error) {
    console.error("Error updating workout", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: {
          message: "Internal Server Error",
        },
      },
      { status: 500 },
    );
  }
}
