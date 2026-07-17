import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { exerciseCatalog } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = context.params;
  const item = await db.query.exerciseCatalog.findFirst({
    where: eq(exerciseCatalog.id, id),
  });
  if (!item) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = context.params;
  const body = await req.json();
  const nombreNormalizado = String(body.nombreNormalizado || "").trim().toLowerCase();
  const grupoMuscular = String(body.grupoMuscular || "").trim();
  const actividad = String(body.actividad || "").trim() || "musculacion";

  if (!nombreNormalizado || !grupoMuscular || !actividad) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const existing = await db.query.exerciseCatalog.findFirst({
    where: eq(exerciseCatalog.id, id),
  });
  if (!existing) return new NextResponse("Not found", { status: 404 });

  const duplicate = await db.query.exerciseCatalog.findFirst({
    where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
  });
  if (duplicate && duplicate.id !== id) {
    return new NextResponse("Exercise with that name already exists", {
      status: 409,
    });
  }

  try {
    await db
      .update(exerciseCatalog)
      .set({ nombreNormalizado, grupoMuscular, actividad })
      .where(eq(exerciseCatalog.id, id));

    const updated = await db.query.exerciseCatalog.findFirst({
      where: eq(exerciseCatalog.id, id),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating exercise catalog item", error);
    return new NextResponse("Internal API Error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = context.params;
  const existing = await db.query.exerciseCatalog.findFirst({
    where: eq(exerciseCatalog.id, id),
  });
  if (!existing) return new NextResponse("Not found", { status: 404 });

  try {
    await db.delete(exerciseCatalog).where(eq(exerciseCatalog.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting exercise catalog item", error);
    return new NextResponse("Internal API Error", { status: 500 });
  }
}
