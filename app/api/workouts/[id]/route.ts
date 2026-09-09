import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  workouts,
  workoutExercises,
  users,
  exerciseCatalog,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { kv } from "@vercel/kv";
import { classifyExercise } from "@/lib/muscleClassifier";
import { generateNewTrainingState } from "@/lib/training-state-utils";
import { ApiResponse } from "@/types/api";
import {
  workoutUpdateInputSchema,
  type WorkoutUpdateInput,
} from "@/lib/schemas/workout";

export async function DELETE(
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

  const incomingIdempotencyKey =
    req.headers.get("Idempotency-Key") ??
    req.headers.get("idempotency-key") ??
    req.headers.get("x-idempotency-key");

  if (!incomingIdempotencyKey?.trim()) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "Missing Idempotency-Key header",
        },
      },
      { status: 400 },
    );
  }

  const normalizedKey = incomingIdempotencyKey.trim();
  const idempotencyKey = `workouts:delete:${existingUser.id}:${id}:${normalizedKey}`;
  const processingKey = `${idempotencyKey}:processing`;

  const cachedResponse = await kv.get<string>(idempotencyKey);
  if (cachedResponse) {
    try {
      return new NextResponse(JSON.parse(cachedResponse), { status: 204 });
    } catch {
      // Ignore invalid cached payload and continue.
    }
  }

  const hasProcessingLock = await kv.set(processingKey, "1", {
    nx: true,
    px: 60_000,
  });

  if (!hasProcessingLock) {
    const retryCachedResponse = await kv.get<string>(idempotencyKey);
    if (retryCachedResponse) {
      try {
        return new NextResponse(JSON.parse(retryCachedResponse), {
          status: 204,
        });
      } catch {
        // Ignore invalid cached payload and continue below.
      }
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "A deletion is already in progress for this request.",
        },
      },
      { status: 409 },
    );
  }

  try {
    const workoutTarget = await db.query.workouts.findFirst({
      where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
    });

    if (!workoutTarget)
      return new NextResponse("Workout not found or access denied", {
        status: 403,
      });

    await db.delete(workouts).where(eq(workouts.id, id));
    await kv.set(idempotencyKey, JSON.stringify({ ok: true }), {
      px: 10 * 60 * 1000,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting workout", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  } finally {
    await kv.del(processingKey);
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

  const incomingIdempotencyKey =
    req.headers.get("Idempotency-Key") ??
    req.headers.get("idempotency-key") ??
    req.headers.get("x-idempotency-key");

  if (!incomingIdempotencyKey?.trim()) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "Missing Idempotency-Key header",
        },
      },
      { status: 400 },
    );
  }

  const normalizedKey = incomingIdempotencyKey.trim();
  const idempotencyKey = `workouts:update:${existingUser.id}:${id}:${normalizedKey}`;
  const processingKey = `${idempotencyKey}:processing`;

  const cachedResponse = await kv.get<string>(idempotencyKey);
  if (cachedResponse) {
    try {
      return new NextResponse(JSON.parse(cachedResponse), { status: 204 });
    } catch {
      // Ignore invalid cached payload and continue.
    }
  }

  const hasProcessingLock = await kv.set(processingKey, "1", {
    nx: true,
    px: 60_000,
  });

  if (!hasProcessingLock) {
    const retryCachedResponse = await kv.get<string>(idempotencyKey);
    if (retryCachedResponse) {
      try {
        return new NextResponse(JSON.parse(retryCachedResponse), {
          status: 204,
        });
      } catch {
        // Ignore invalid cached payload and continue below.
      }
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "An update is already in progress for this request.",
        },
      },
      { status: 409 },
    );
  }

  try {
    const workoutTarget = await db.query.workouts.findFirst({
      where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
    });
    if (!workoutTarget)
      return new NextResponse("Workout not found or access denied", {
        status: 403,
      });

    const body = await req.json();
    const parsedBody = workoutUpdateInputSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          data: null,
          error: { message: "Invalid workout payload" },
        },
        { status: 400 },
      );
    }

    const {
      date: fecha,
      exercises: ejercicios,
      deletedExerciseIds = [],
    } = parsedBody.data;

    const preparedExercises = await Promise.all(
      (ejercicios ?? []).map(async (exercise) => {
        const nombreNormalizado = exercise.nombre.trim().toLowerCase();
        const catalogEntry = await db.query.exerciseCatalog.findFirst({
          where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
        });

        return {
          exercise,
          nombreNormalizado,
          catalogEntry,
          classifiedExercise: catalogEntry
            ? null
            : await classifyExercise(exercise.nombre),
        };
      }),
    );

    await db.transaction(async (tx) => {
      await tx
        .select({ id: workouts.id })
        .from(workouts)
        .where(and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)))
        .for("update");

      if (fecha) {
        await tx
          .update(workouts)
          .set({ fecha, updatedAt: new Date() })
          .where(eq(workouts.id, id));
      }

      if (ejercicios) {
        const existingExercises = await tx
          .select({ id: workoutExercises.id })
          .from(workoutExercises)
          .where(eq(workoutExercises.workoutId, id));
        const existingExerciseIds = new Set(
          existingExercises.map((exercise) => exercise.id),
        );
        const submittedExistingIds = ejercicios
          .map((exercise) => exercise.id)
          .filter((exerciseId): exerciseId is string => Boolean(exerciseId));
        const referencedIds = [...submittedExistingIds, ...deletedExerciseIds];

        if (
          referencedIds.some(
            (exerciseId) => !existingExerciseIds.has(exerciseId),
          ) ||
          new Set(referencedIds).size !== referencedIds.length
        ) {
          throw new Error("Invalid exercise identity for workout update");
        }

        if (deletedExerciseIds.length > 0) {
          await tx
            .delete(workoutExercises)
            .where(
              and(
                eq(workoutExercises.workoutId, id),
                inArray(workoutExercises.id, deletedExerciseIds),
              ),
            );
        }

        for (const preparedExercise of preparedExercises) {
          const { exercise: ex, nombreNormalizado } = preparedExercise;
          let catalogEntry = preparedExercise.catalogEntry;

          if (!catalogEntry) {
            const classifiedExercise = preparedExercise.classifiedExercise;
            if (!classifiedExercise) {
              throw new Error("Exercise classification was not prepared");
            }

            const [inserted] = await tx
              .insert(exerciseCatalog)
              .values({
                id: crypto.randomUUID(),
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

          const exerciseValues = {
            exerciseCatalogId: catalogEntry.id,
            nombre: catalogEntry.nombreNormalizado,
            series: ex.series,
            repeticiones: ex.repeticiones ?? 0,
            peso: ex.peso ?? 0,
            duracionSegundos: ex.duracionSegundos ?? 0,
            grupoMuscular: catalogEntry.grupoMuscular,
            notas: ex.notas ?? null,
          };

          if (ex.id) {
            await tx
              .update(workoutExercises)
              .set(exerciseValues)
              .where(
                and(
                  eq(workoutExercises.id, ex.id),
                  eq(workoutExercises.workoutId, id),
                ),
              );
          } else {
            await tx.insert(workoutExercises).values({
              id: crypto.randomUUID(),
              workoutId: id,
              ...exerciseValues,
            });
          }
        }
      }
    });

    await kv.set(idempotencyKey, JSON.stringify({ ok: true }), {
      px: 10 * 60 * 1000,
    });

    return new NextResponse(null, { status: 204 });
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
  } finally {
    await kv.del(processingKey);
  }
}
