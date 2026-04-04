import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EditableObjectiveForm from "@/components/entrenamientos/EditableObjectiveForm";
import { db } from "../../../db";
import { trainingObjectives, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { runDbQueryWithRetries } from "@/lib/db-utils";

export default async function ObjectivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  try {
    const internalUser = await runDbQueryWithRetries(() =>
      db.query.users.findFirst({ where: eq(users.externalAuthId, userId) }),
    );

    if (!internalUser)
      return <div className="p-8">Error cargando perfil...</div>;

    const latestObjective = await db.query.trainingObjectives.findFirst({
      where: eq(trainingObjectives.userId, internalUser.id),
      orderBy: [desc(trainingObjectives.updatedAt)],
    });

    // Ensure we only pass plain primitives to the client component
    const initial = latestObjective ? String(latestObjective.content) : null;

    return <EditableObjectiveForm initial={initial} />;
  } catch (err) {
    // Avoid leaking complex error objects into the client boundary
    console.error("DB error in ObjectivePage:", err);
    return <div className="p-8">Error cargando perfil...</div>;
  }
}
