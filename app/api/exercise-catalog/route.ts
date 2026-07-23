import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { exerciseCatalog } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { exerciseCatalogCreateInputSchema } from "@/lib/schemas/exercise-catalog";

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
  const parsedBody = exerciseCatalogCreateInputSchema.safeParse(body);

  if (!parsedBody.success) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const { nombreNormalizado, grupoMuscular, actividad } = parsedBody.data;

  const existing = await db.query.exerciseCatalog.findFirst({
    where: eq(exerciseCatalog.nombreNormalizado, nombreNormalizado),
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
