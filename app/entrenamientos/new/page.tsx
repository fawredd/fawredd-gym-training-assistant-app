import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../../db";
import { workouts, users } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import EditableWorkoutForm from "../EditableWorkoutForm";

export default async function NewWorkoutPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const resolvedParams = await searchParams;
    const baseId = typeof resolvedParams.baseId === "string" ? resolvedParams.baseId : null;

    const existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });

    if (!existingUser)
        return (
            <div className="p-8 text-center text-muted-foreground">
                Perfil no encontrado.{" "}
                <Link href="/dashboard" className="text-primary underline">
                    Ir al Dashboard
                </Link>
            </div>
        );

    let initialExercises: { nombre: string; series: number; repeticiones: number; peso: number }[] = [];
    let initialFecha = new Date().toISOString().split("T")[0];

    // If baseId is provided, clone exercises from that workout
    if (baseId) {
        const baseWorkout = await db.query.workouts.findFirst({
            where: and(eq(workouts.id, baseId), eq(workouts.userId, existingUser.id)),
            with: { exercises: true },
        });

        if (baseWorkout) {
            initialExercises = baseWorkout.exercises.map((ex) => ({
                nombre: ex.nombre,
                series: ex.series ?? 3,
                repeticiones: ex.repeticiones ?? 0,
                peso: ex.peso ?? 0,
            }));
            // Keep today's date for the new workout, not the base workout's date
        }
    }

    return (
        <div className="max-w-lg mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {baseId ? "Nuevo (basado en anterior)" : "Nuevo Entrenamiento"}
                </h1>
                <Link
                    href="/entrenamientos"
                    className="text-sm text-primary hover:underline"
                >
                    ← Volver
                </Link>
            </div>
            <EditableWorkoutForm
                workoutId=""
                initialFecha={initialFecha}
                initialExercises={initialExercises}
                mode="create"
            />
        </div>
    );
}
