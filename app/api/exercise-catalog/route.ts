import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { exerciseCatalog } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const items = await db.query.exerciseCatalog.findMany({
    orderBy: [asc(exerciseCatalog.nombreNormalizado)],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const nombreNormalizado = String(body.nombreNormalizado || "")
    .trim()
    .toLowerCase();
  const grupoMuscular = String(body.grupoMuscular || "").trim();
  const actividad = String(body.actividad || "").trim() || "musculacion";

  if (!nombreNormalizado || !grupoMuscular || !actividad) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const existing = await db.query.exerciseCatalog.findFirst({
    where: exerciseCatalog.nombreNormalizado.eq(nombreNormalizado),
  });
  if (existing) {
    return new NextResponse("Exercise with that name already exists", {
      status: 409,
    });
  }

  try {
    const [inserted] = await db
      .insert(exerciseCatalog)
      .values({
        id: crypto.randomUUID(),
        nombreNormalizado,
        grupoMuscular,
        actividad,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("Error creating exercise catalog item", error);
    return new NextResponse("Internal API Error", { status: 500 });
  }
}
