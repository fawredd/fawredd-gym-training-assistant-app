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

  const workoutTarget = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
  });

  if (!workoutTarget)
    return new NextResponse("Workout not found or access denied", {
      status: 403,
    });

  try {
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

  const workoutTarget = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
  });
  if (!workoutTarget)
    return new NextResponse("Workout not found or access denied", {
      status: 403,
    });

  const body = await req.json();
  const parsedBody = workoutUpdateInputSchema.safeParse(body);
  const { date: fecha, exercises: ejercicios } = (
    parsedBody.success ? parsedBody.data : (body as WorkoutUpdateInput)
  ) as WorkoutUpdateInput;

  try {
    await db.transaction(async (tx) => {
      if (fecha) {
        await tx
          .update(workouts)
          .set({ fecha, updatedAt: new Date() })
          .where(eq(workouts.id, id));
      }

      if (ejercicios) {
        await tx
          .delete(workoutExercises)
          .where(eq(workoutExercises.workoutId, id));

        if (ejercicios.length > 0) {
          const rows = await Promise.all(
            ejercicios.map(async (ex) => {
              const nombreNormalizado = ex.nombre.trim().toLowerCase();

              let catalogEntry = await tx.query.exerciseCatalog.findFirst({
                where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
              });

              if (!catalogEntry) {
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

              return {
                id: crypto.randomUUID(),
                workoutId: id,
                exerciseCatalogId: catalogEntry.id,
                nombre: catalogEntry.nombreNormalizado,
                series: ex.series,
                repeticiones: ex.repeticiones ?? 0,
                peso: ex.peso ?? 0,
                duracionSegundos: ex.duracionSegundos ?? 0,
                grupoMuscular: catalogEntry.grupoMuscular,
                notas: ex.notas ?? null,
              };
            }),
          );

          await tx.insert(workoutExercises).values(rows);
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
