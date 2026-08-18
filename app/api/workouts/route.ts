import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { kv } from "@vercel/kv";
import { saveWorkoutsWithExercises } from "@/lib/workouts-utils";
import {
  workoutCreateInputSchema,
  type WorkoutInput,
} from "@/lib/schemas/workout";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "Unauthorized",
        },
      },
      { status: 401 },
    );

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "User profile setup incomplete",
        },
      },
      { status: 404 },
    );

  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, existingUser.id),
    orderBy: [desc(workouts.fecha)],
    with: {
      exercises: {
        with: {
          exercise: true, // This fetches the exerciseCatalog relation
        },
      },
    },
  });

  return NextResponse.json(userWorkouts);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "User not found.",
        },
      },
      { status: 404 },
    );

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
  const idempotencyKey = `workouts:idempotency:${existingUser.id}:${normalizedKey}`;
  const processingKey = `${idempotencyKey}:processing`;

  const cachedResponse = await kv.get<string>(idempotencyKey);
  if (cachedResponse) {
    try {
      return NextResponse.json(JSON.parse(cachedResponse), { status: 200 });
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
        return NextResponse.json(JSON.parse(retryCachedResponse), {
          status: 200,
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
          message:
            "A workout creation is already in progress for this request.",
        },
      },
      { status: 409 },
    );
  }

  try {
    const body = await req.json();
    const parsedBody = workoutCreateInputSchema.safeParse(body);
    const { date, exercises } = (
      parsedBody.success ? parsedBody.data : (body as WorkoutInput)
    ) as WorkoutInput;

    const workoutInput: WorkoutInput = {
      date,
      exercises,
    };

    const [inserted] = await saveWorkoutsWithExercises(existingUser.id, [
      workoutInput,
    ]);

    const successPayload = {
      success: true,
      data: {
        id: inserted.workoutId,
      },
      error: null,
    };

    await kv.set(idempotencyKey, JSON.stringify(successPayload), {
      px: 10 * 60 * 1000,
    });

    return NextResponse.json(successPayload, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: "Internal API Error",
        },
      },
      { status: 500 },
    );
  } finally {
    await kv.del(processingKey);
  }
}
