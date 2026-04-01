import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { workouts, workoutExercises, users, aiMemories } from "../../db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";
import { Header } from "@/components/dashboard/Header";
import { MainCta } from "@/components/dashboard/MainCta";
import { DailyStatus } from "@/components/dashboard/DailyStatus";
import { TrainingCalendar } from "@/components/dashboard/TrainingCalendar";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { AIInsight } from "@/components/dashboard/AIInsight";

// ── Keyword → muscle group classifier ──────────────────────────────────
const MUSCLE_MAP: Record<string, string> = {
    pecho: "Pecho",
    press: "Pecho",
    fondos: "Pecho",
    espalda: "Espalda",
    remo: "Espalda",
    jalón: "Espalda",
    jalon: "Espalda",
    dominadas: "Espalda",
    hombro: "Hombros",
    lateral: "Hombros",
    deltoides: "Hombros",
    bícep: "Bíceps",
    bicep: "Bíceps",
    curl: "Bíceps",
    trícep: "Tríceps",
    tricep: "Tríceps",
    extensión: "Tríceps",
    extension: "Tríceps",
    pierna: "Piernas",
    sentadilla: "Piernas",
    squat: "Piernas",
    femoral: "Piernas",
    cuádricep: "Piernas",
    cuadricep: "Piernas",
    gemelo: "Piernas",
    lunges: "Piernas",
    peso: "Espalda",
    deadlift: "Espalda",
    core: "Core",
    abdomen: "Core",
    plancha: "Core",
    crunch: "Core",
};

function classifyExercise(nombre: string): string {
    const lower = nombre.toLowerCase();
    for (const [keyword, group] of Object.entries(MUSCLE_MAP)) {
        if (lower.includes(keyword)) return group;
    }
    return "Otros";
}

function formatDateKey(date: Date): string {
    return date.toISOString().split("T")[0];
}

// ── Page ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const clerkUser = await currentUser();
    let userName = "Usuario";

    if (clerkUser) {
        const defaultName = clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
            : "Usuario";

        let existingUser = await db.query.users.findFirst({
            where: eq(users.externalAuthId, userId),
        });

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

    const internalUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });

    if (!internalUser) return <div className="p-8">Error cargando perfil...</div>;

    // ── Dates ────────────────────────────────────────────────────────────
    const now = new Date();
    const todayStr = formatDateKey(now);

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 19);
    twentyDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // ── Single query for last 20 days workouts + exercises ───────────────
    const recentWorkouts = await db.query.workouts.findMany({
        where: and(eq(workouts.userId, internalUser.id), gte(workouts.fecha, twentyDaysAgo)),
        orderBy: [desc(workouts.fecha)],
        with: { exercises: true },
    });

    // ── Build workoutsByDate map for calendar ────────────────────────────
    const workoutsByDate: Record<string, { id: string; fecha: string; exercises: { id: string; nombre: string; series: number | null; repeticiones: number | null; peso: number | null; duracionSegundos: number | null }[] }> = {};
    for (const w of recentWorkouts) {
        const key = formatDateKey(new Date(w.fecha));
        if (!workoutsByDate[key]) {
            workoutsByDate[key] = {
                id: w.id,
                fecha: w.fecha.toISOString(),
                exercises: w.exercises.map((ex) => ({
                    id: ex.id,
                    nombre: ex.nombre,
                    series: ex.series,
                    repeticiones: ex.repeticiones,
                    peso: ex.peso,
                    duracionSegundos: ex.duracionSegundos,
                })),
            };
        }
    }

    // ── Trained today? ────────────────────────────────────────────────────
    const trainedToday = todayStr in workoutsByDate;

    // ── Weekly summary (last 7 days) ──────────────────────────────────────
    const weeklyWorkouts = recentWorkouts.filter(
        (w) => new Date(w.fecha) >= sevenDaysAgo
    );

    // Track unique training days
    const uniqueTrainingDays = new Set(
        weeklyWorkouts.map((w) => formatDateKey(new Date(w.fecha)))
    ).size;

    // Count muscle groups across all exercises in last 7 days
    const muscleGroupDays: Record<string, Set<string>> = {};
    for (const w of weeklyWorkouts) {
        const dayKey = formatDateKey(new Date(w.fecha));
        for (const ex of w.exercises) {
            const group = classifyExercise(ex.nombre);
            if (!muscleGroupDays[group]) muscleGroupDays[group] = new Set();
            muscleGroupDays[group].add(dayKey);
        }
    }

    const muscleGroups = Object.entries(muscleGroupDays)
        .map(([nombre, days]) => ({ nombre, dias: days.size }))
        .sort((a, b) => b.dias - a.dias);

    // ── Latest AI memory ──────────────────────────────────────────────────
    const latestMemory = await db.query.aiMemories.findFirst({
        where: eq(aiMemories.userId, internalUser.id),
        orderBy: [desc(aiMemories.fecha)],
    });

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
                <Header userName={userName} />
                <main className="flex flex-col gap-5 pb-10 pt-4 max-w-lg mx-auto w-full">
                    <MainCta />
                    <DailyStatus
                        trainedToday={trainedToday}
                        lastAiSnippet={latestMemory?.contenido ?? null}
                    />
                    <TrainingCalendar workoutsByDate={workoutsByDate} />
                    <WeeklySummary
                        muscleGroups={muscleGroups}
                        totalDays={uniqueTrainingDays}
                    />
                    <AIInsight
                        contenido={latestMemory?.contenido ?? null}
                        fecha={latestMemory?.fecha ?? null}
                    />
                </main>
            </div>
        </ThemeProvider>
    );
}
