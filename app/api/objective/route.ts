import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../../db";
import { trainingObjectives, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateNewTrainingState } from "@/lib/training-state-utils";
import { revalidatePath } from "next/cache";
import { MAX_OBJECTIVE_CONTENT_LENGTH } from "@/lib/schemas/objective";

const PROMPT_INJECTION_PATTERN =
  /(ignore(?:\s+(?:all|the))?\s+instructions|ignore previous instructions|ignore prior context|override(?:\s+the)?\s*(?:system|developer)?\s*prompt|system prompt|developer prompt|reveal hidden|bypass|pretend to be|act as|forget everything|<\s*(?:system|developer)\s*>)/i;

function sanitizeObjectiveContent(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Objective content must be a string.");
  }

  const normalized = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("Objective content cannot be empty.");
  }

  if (normalized.length > MAX_OBJECTIVE_CONTENT_LENGTH) {
    throw new Error("Objective content is too long.");
  }

  if (PROMPT_INJECTION_PATTERN.test(normalized)) {
    throw new Error("Suspicious prompt content detected.");
  }

  return normalized;
}

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
  revalidatePath("/dashboard/");
  return NextResponse.json({ objective: objective ? objective.content : null });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser) return new NextResponse("User not found", { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const content = (body as { content?: unknown })?.content;

  try {
    const sanitizedContent = sanitizeObjectiveContent(content);

    // Upsert behavior: update latest objective if exists, otherwise insert
    const existingObjective = await db.query.trainingObjectives.findFirst({
      where: eq(trainingObjectives.userId, existingUser.id),
      orderBy: [desc(trainingObjectives.updatedAt)],
    });

    if (existingObjective) {
      await db
        .update(trainingObjectives)
        .set({ content: sanitizedContent, updatedAt: new Date() })
        .where(eq(trainingObjectives.id, existingObjective.id));
    } else {
      await db.insert(trainingObjectives).values({
        id: crypto.randomUUID(),
        userId: existingUser.id,
        content: sanitizedContent,
        updatedAt: new Date(),
      });
    }

    // Security improvement: always await the training-state refresh to guarantee the
    // downstream UI is built from the same sanitized objective snapshot.
    await generateNewTrainingState(existingUser);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Objective content") ||
        error.message.includes("Suspicious prompt content"))
    ) {
      return new NextResponse(error.message, { status: 400 });
    }

    console.error("Error saving objective", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
