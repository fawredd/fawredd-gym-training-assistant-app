import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EditableObjectiveForm from "@/components/entrenamientos/EditableObjectiveForm";
import { db } from "../../../db";
import { trainingObjectives, users } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { runDbQueryWithRetries } from "@/lib/db-utils";
import { Header } from "@/components/dashboard/Header";

export default async function ObjectivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const internalUser = await runDbQueryWithRetries(() =>
    db.query.users.findFirst({ where: eq(users.externalAuthId, userId) }),
  );

  if (!internalUser) return <div className="p-8">Error cargando perfil...</div>;

  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, internalUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });

  // Ensure we only pass plain primitives to the client component
  const initial = latestObjective ? String(latestObjective.content) : null;

  return (
    <>
      <Header userName={internalUser.name} />
      <main className="flex flex-col h-[calc(100vh-120px)] gap-5 pb-10 pt-4 max-w-lg mx-auto w-full min-h-0">
        <EditableObjectiveForm initial={initial} />;
      </main>
    </>
  );
}
