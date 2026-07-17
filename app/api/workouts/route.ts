import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  workouts,
  users,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { saveWorkoutsWithExercises, WorkoutInput } from "@/lib/workouts-utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser)
    return new NextResponse("User profile setup incomplete", { status: 404 });

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

  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  try {
    const body = await req.json();
    const { date, exercises }: WorkoutInput = body;

    const workoutInput: WorkoutInput = {
      date,
      exercises
    };

    const [inserted] = await saveWorkoutsWithExercises(
      existingUser.id,
      [workoutInput], // Pasamos el único workout dentro de un array
    );

    return NextResponse.json({ id: inserted.workoutId }, { status: 201 });

  } catch (error) {
    console.error("Error creating workout:", error);
    return new NextResponse("Internal API Error", { status: 500 });
  }
}
