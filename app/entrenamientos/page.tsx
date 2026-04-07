import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WorkoutForm from "./WorkoutForm";
import AiWorkoutForm from "./AiWorkoutForm";
import { db } from "../../db";
import { workouts, users } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import DeleteWorkoutButton from "./DeleteWorkoutButton";
import { Header } from "@/components/dashboard/Header";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default async function EntrenamientosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });

  if (!existingUser) {
    return (
      <div className="p-8 text-center">
        Iniciando tu perfil. Por favor, asegúrate de visitar el Dashboard
        primero.{" "}
        <Link href="/dashboard" className="text-primary underline">
          Ir al Dashboard
        </Link>
      </div>
    );
  }

  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, existingUser.id),
    orderBy: [desc(workouts.fecha)],
    with: {
      exercises: true,
    },
  });

  return (
    <>
      <Header userName={existingUser.nombre || "-"} />
      <div className="max-w-5xl w-full p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-primary">
            Mis Entrenamientos
          </h1>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground font-medium"
          >
            ← Volver
          </Link>
        </div>
        <Accordion multiple defaultValue={['1']} className="w-full bg-background">
          <AccordionItem value="1">
            <AccordionTrigger className="data-[state=open]:bg-background">Carga Manual</AccordionTrigger>
            <AccordionContent className="data-[state=open]:bg-background">
              <WorkoutForm />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="2">
            <AccordionTrigger>Carga Acelerada (IA) ✨</AccordionTrigger>
            <AccordionContent>
              <AiWorkoutForm />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="3">
            <AccordionTrigger>Historial de Entrenamientos</AccordionTrigger>
            <AccordionContent>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Historial</h2>
                <Link
                  href="/entrenamientos/new"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  + Nuevo
                </Link>
              </div>

              <div className="space-y-4">
                {userWorkouts.length === 0 ? (
                  <div className="bg-muted text-center p-8 rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">
                      No tienes entrenamientos registrados aún.
                    </p>
                  </div>
                ) : (
                  userWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
                        <p className="font-semibold text-lg">
                          {w.fecha.toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                            {w.exercises.length} ejercicios
                          </span>
                          <Link
                            href={`/entrenamientos/${w.id}/edit`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            ✏️
                          </Link>
                          <DeleteWorkoutButton workoutId={w.id} />
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm text-foreground">
                        {w.exercises.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex justify-between items-center"
                          >
                            <span className="font-medium">{ex.nombre}</span>
                            <span className="text-muted-foreground">
                              {ex.duracionSegundos &&
                              ex.duracionSegundos > 0 ? (
                                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  {ex.duracionSegundos}s
                                </span>
                              ) : (
                                <>
                                  {ex.series}x{ex.repeticiones}{" "}
                                  <span className="text-muted-foreground">
                                    |
                                  </span>{" "}
                                  {ex.peso}kg
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
