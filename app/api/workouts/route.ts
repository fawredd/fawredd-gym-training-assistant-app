import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

    const [inserted] = await saveWorkoutsWithExercises(
      existingUser.id,
      [workoutInput], // Pasamos el único workout dentro de un array
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: inserted.workoutId,
        },
        error: null,
      },
      { status: 201 },
    );
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
  }
}
