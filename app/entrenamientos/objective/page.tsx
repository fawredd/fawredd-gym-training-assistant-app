import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EditableObjectiveForm from "@/components/entrenamientos/EditableObjectiveForm";
import { db } from "../../../db";
import { trainingObjectives, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";

export default async function ObjectivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const internalUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!internalUser) return <div className="p-8">Error cargando perfil...</div>;

  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, internalUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });

  return <EditableObjectiveForm initial={latestObjective?.content ?? null} />;
}
