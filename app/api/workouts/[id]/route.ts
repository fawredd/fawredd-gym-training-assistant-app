import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../../db";
import { workouts, workoutExercises, users } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

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

  const body = await req.json();
  const { fecha, ejercicios } = body;

  try {
    // Use a transaction to ensure update + delete/insert exercises are atomic
    await db.transaction(async (tx) => {
      if (fecha) {
        await tx
          .update(workouts)
          .set({ fecha: new Date(fecha), updatedAt: new Date() })
          .where(eq(workouts.id, id));
      }

      if (ejercicios) {
        await tx
          .delete(workoutExercises)
          .where(eq(workoutExercises.workoutId, id));
        if (ejercicios.length > 0) {
          await tx.insert(workoutExercises).values(
            ejercicios.map((ex: any) => ({
              id: crypto.randomUUID(),
              workoutId: id,
              nombre: ex.nombre,
              series: ex.series,
              repeticiones: ex.repeticiones,
              peso: ex.peso,
            })),
          );
        }
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error updating workout", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
