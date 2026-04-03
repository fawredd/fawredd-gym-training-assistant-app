import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import { trainingObjectives, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  const objective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, existingUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });

  return NextResponse.json({ objective: objective ? objective.content : null });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  const body = await req.json();
  const { content } = body;
  if (!content || typeof content !== "string")
    return new NextResponse("Invalid body", { status: 400 });

  try {
    // Upsert behavior: update latest objective if exists, otherwise insert
    const existingObjective = await db.query.trainingObjectives.findFirst({
      where: eq(trainingObjectives.userId, existingUser.id),
      orderBy: [desc(trainingObjectives.updatedAt)],
    });

    if (existingObjective) {
      await db
        .update(trainingObjectives)
        .set({ content, updatedAt: new Date() })
        .where(eq(trainingObjectives.id, existingObjective.id));
    } else {
      await db.insert(trainingObjectives).values({
        id: crypto.randomUUID(),
        userId: existingUser.id,
        content,
        updatedAt: new Date(),
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error saving objective", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
