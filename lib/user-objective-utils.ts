import { db } from "@/db";
import { TrainingObjective, trainingObjectives, User } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

  export async function fetchLatestTrainingObjective(existingUser: User): Promise<TrainingObjective | undefined> {
  // Fetch latest training objective
  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, existingUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });
  return latestObjective;
}