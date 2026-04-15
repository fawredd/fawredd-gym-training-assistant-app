import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../../db";
import {
  workouts,
  users,
  aiMemories,
  trainingObjectives,
} from "../../db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";
import { runDbQueryWithRetries } from "@/lib/db-utils";
import { Header } from "@/components/dashboard/Header";
import { MainCta } from "@/components/dashboard/MainCta";
//import { DailyStatus } from "@/components/dashboard/DailyStatus";
import { TrainingCalendar } from "@/components/dashboard/TrainingCalendar";
import { PeriodSummary } from "@/components/dashboard/PeriodSummary";
import { AIInsight } from "@/components/dashboard/AIInsight";
import { classifyExercise } from "@/lib/muscleClassifier";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X } from "lucide-react";
import { redirect } from "next/navigation";
import { buildChartData } from "@/lib/muscleGraphData";
import { AIResponse, formatAIResponseForUI } from "@/lib/ai-response";

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}



// ── Page ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  let userName = "Usuario";

  if (clerkUser) {
    const defaultName = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
      : "Usuario";

    let existingUser = await runDbQueryWithRetries(() =>
      db.query.users.findFirst({ where: eq(users.externalAuthId, userId) }),
    );

    if (!existingUser) {
      await db.insert(users).values({
        id: crypto.randomUUID(),
        externalAuthId: userId,
        nombre: defaultName,
      });
      existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
      });
    }
    userName = existingUser?.nombre ?? defaultName;
  }

  const internalUser = await runDbQueryWithRetries(() =>
    db.query.users.findFirst({ where: eq(users.externalAuthId, userId) }),
  );

  if (!internalUser) return <div className="p-8">Error cargando perfil...</div>;

  // ── Dates ────────────────────────────────────────────────────────────

  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 19);
  twentyDaysAgo.setHours(0, 0, 0, 0);

  const xDaysAgo = new Date();
  xDaysAgo.setDate(xDaysAgo.getDate() - 19); //Number of days to summarize
  xDaysAgo.setHours(0, 0, 0, 0);

  // ── Single query for last 20 days workouts + exercises ───────────────
  const recentWorkouts = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, internalUser.id),
      gte(workouts.fecha, twentyDaysAgo),
    ),
    orderBy: [desc(workouts.fecha)],
    with: { exercises: true },
  });

  // ── Build workoutsByDate map for calendar ────────────────────────────
  // DB (server)
  type DbWorkout = (typeof recentWorkouts)[number];
  type DbExercise = DbWorkout["exercises"][number];

  type Exercise = Omit<DbExercise, "createdAt">;
  interface Workout {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    fecha: string;
    exercises: Exercise[];
  }
  type WorkoutsByDate = Record<string, Workout[]>;
  const workoutsByDate: WorkoutsByDate = {};

  for (const w of recentWorkouts) {
    const key = formatDateKey(new Date(w.fecha));

    if (!workoutsByDate[key]) {
      workoutsByDate[key] = [];
    }

    workoutsByDate[key].push({
      id: w.id,
      userId: w.userId,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      fecha: w.fecha.toISOString(),
      exercises: w.exercises.map((ex) => ({
        id: ex.id,
        nombre: ex.nombre,
        peso: ex.peso,
        series: ex.series,
        repeticiones: ex.repeticiones,
        duracionSegundos: ex.duracionSegundos,
        // 👇 este también era Date antes
        createdAt: ex.createdAt.toISOString(),
        workoutId: ex.workoutId,
      })),
    });
  }

  // ── Period summary (last X days) ──────────────────────────────────────
  const periodWorkouts = recentWorkouts.filter(
    (w) => new Date(w.fecha) >= xDaysAgo,
  );

  // Track unique training days
  const uniqueTrainingDays = new Set(
    periodWorkouts.map((w) => formatDateKey(new Date(w.fecha))),
  ).size;

  // Count muscle groups across all exercises in last 7 days
  const muscleGroupDays: Record<string, Set<string>> = {};
  for (const w of periodWorkouts) {
    const dayKey = formatDateKey(new Date(w.fecha));
    for (const ex of w.exercises) {
      const group = await classifyExercise(ex.nombre);
      if (!muscleGroupDays[group]) muscleGroupDays[group] = new Set();
      muscleGroupDays[group].add(dayKey);
    }
  }

  const muscleGroups = Object.entries(muscleGroupDays)
    .map(([nombre, days]) => ({ nombre, dias: days.size }))
    .sort((a, b) => b.dias - a.dias);

  // Muscle group progress over time (for potential future use in a graph)
  const chartData = await buildChartData(periodWorkouts);

  // ── Latest AI memory ──────────────────────────────────────────────────
  const latestMemory = await db.query.aiMemories.findFirst({
    where: eq(aiMemories.userId, internalUser.id),
    orderBy: [desc(aiMemories.fecha)],
  });

  // Get latest training objective
  const latestObjective = await db.query.trainingObjectives.findFirst({
    where: eq(trainingObjectives.userId, internalUser.id),
    orderBy: [desc(trainingObjectives.updatedAt)],
  });

  // Serialize server-side Dates to strings to avoid sending class instances
  const latestMemoryFecha = latestMemory?.fecha
    ? latestMemory.fecha.toISOString()
    : null;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header userName={userName} />
        <main className="flex flex-col gap-5 pb-10 pt-4 max-w-lg mx-auto w-full">
          <div className="mx-4 md:mx-8">
          <Accordion className="bg-transparent border">
            <AccordionItem value="1">
              <AccordionTrigger>
                Objetivo planteado{" "}
                { latestObjective?.content && (
                  <Check className="text-green-500" />
                ) || (<X className="text-red-500" />)}
              </AccordionTrigger>
              <AccordionContent>
                {/* ObjectiveCard rendered inline */}
                <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold">Objetivo actual</h2>
                    <a
                      href="/entrenamientos/objective"
                      className="text-xs text-primary hover:underline"
                    >
                      {latestObjective?.content ? "Editar" : "Agregar"}
                    </a>
                  </div>
                  {latestObjective?.content ? (
                    <p className="text-sm text-foreground">
                      {latestObjective.content}
                    </p>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No hay objetivo definido.{" "}
                      <a
                        href="/entrenamientos/objective"
                        className="text-primary underline"
                      >
                        Agregar objetivo
                      </a>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </div>

          <MainCta />

          <AIInsight
            contenido={latestMemory ? formatAIResponseForUI(JSON.parse(latestMemory.contenido) as AIResponse) : null}
            fecha={latestMemoryFecha}
          />
          <PeriodSummary
            muscleGroups={muscleGroups}
            totalDays={uniqueTrainingDays}
            chartData={chartData}
          />
          <TrainingCalendar workoutsByDate={workoutsByDate} />
        </main>
      </div>
    </ThemeProvider>
  );
}
