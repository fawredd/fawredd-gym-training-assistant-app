import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../../../db";
import { workouts, users } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import EditableWorkoutForm from "../../EditableWorkoutForm";

export default async function EditWorkoutPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) redirect("/");

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

    const workout = await db.query.workouts.findFirst({
        where: and(eq(workouts.id, id), eq(workouts.userId, existingUser.id)),
        with: { exercises: true },
    });

    if (!workout)
        return (
            <div className="p-8 text-center text-muted-foreground">
                Entrenamiento no encontrado.{" "}
                <Link href="/entrenamientos" className="text-primary underline">
                    Volver
                </Link>
            </div>
        );

    const initialExercises = workout.exercises.map((ex) => ({
        nombre: ex.nombre,
        series: ex.series ?? 3,
        repeticiones: ex.repeticiones ?? 0,
        peso: ex.peso ?? 0,
    }));

    return (
        <div className="max-w-lg mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Editar Entrenamiento</h1>
                <Link
                    href="/entrenamientos"
                    className="text-sm text-primary hover:underline"
                >
                    ← Volver
                </Link>
            </div>
            <EditableWorkoutForm
                workoutId={workout.id}
                initialFecha={workout.fecha.toISOString().split("T")[0]}
                initialExercises={initialExercises}
                mode="edit"
            />
        </div>
    );
}
