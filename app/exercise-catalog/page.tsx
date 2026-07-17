import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { exerciseCatalog } from "@/db/schema";
import { asc } from "drizzle-orm";
import ExerciseCatalogManager from "./ExerciseCatalogManager";

export default async function ExerciseCatalogPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const items = await db.query.exerciseCatalog.findMany({
    orderBy: [asc(exerciseCatalog.nombreNormalizado)],
  });

  return (
    <div className="max-w-6xl w-full p-4 md:p-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">Catálogo de ejercicios</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Revisa y modifica la lista de ejercicios normalizados que utiliza la aplicación para clasificar rutinas.
        </p>
      </div>

      <ExerciseCatalogManager initialItems={items} />
    </div>
  );
}
