import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import { workouts, workoutExercises, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { classifyExercise } from "@/lib/muscleClassifier";

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
      exercises: true,
    },
  });

  return NextResponse.json(userWorkouts);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { fecha, ejercicios } = body;

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  try {
    const workoutId = crypto.randomUUID();

    // Create the workout
    await db.insert(workouts).values({
      id: workoutId,
      userId: existingUser.id,
      fecha,
    });

    // Create the exercises if any
    if (ejercicios && ejercicios.length > 0) {
      const rows = await Promise.all(
        ejercicios.map(async (ex: any) => ({
          id: crypto.randomUUID(),
          workoutId: workoutId,
          nombre: ex.nombre,
          series: ex.series,
          repeticiones: ex.repeticiones,
          peso: ex.peso,
          duracionSegundos: ex.duracionSegundos,
          grupoMuscular: await classifyExercise(ex.nombre), 
        })),
      );
      await db.insert(workoutExercises).values(rows);
    }

    return NextResponse.json({ id: workoutId }, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return new NextResponse("Internal API Error", { status: 500 });
  }
}
