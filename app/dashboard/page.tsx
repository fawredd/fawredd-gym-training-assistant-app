import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { workouts, workoutExercises, users } from "../../db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import Link from "next/link";
import AiSuggestion from "./AiSuggestion";

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const clerkUser = await currentUser();
    let userName = "Usuario";

    if (clerkUser) {
        const defaultName = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim() : "Usuario";

        // First-login sync pattern
        const existingUser = await db.query.users.findFirst({
            where: eq(users.externalAuthId, userId),
        });

        if (!existingUser) {
            await db.insert(users).values({
                id: crypto.randomUUID(),
                externalAuthId: userId,
                nombre: defaultName,
            });
            userName = defaultName;
        } else {
            userName = existingUser.nombre ?? defaultName;
        }
    }

    // Get current user again for ID
    const internalUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });

    if (!internalUser) return <div className="p-8">Error cargando perfil...</div>;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(workouts)
        .where(and(eq(workouts.userId, internalUser.id), gte(workouts.fecha, sevenDaysAgo)));
    const workoutsLast7Days = recentCountResult[0].count;

    const volumeResult = await db.select({
        totalVolume: sql<number>`sum(${workoutExercises.peso} * ${workoutExercises.repeticiones} * ${workoutExercises.series})`
    })
        .from(workoutExercises)
        .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
        .where(eq(workouts.userId, internalUser.id));
    const totalVolume = volumeResult[0].totalVolume || 0;

    const recentWorkouts = await db.query.workouts.findMany({
        where: eq(workouts.userId, internalUser.id),
        orderBy: [desc(workouts.fecha)],
        limit: 3,
        with: { exercises: true }
    });

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Hola, {userName} 👋</h1>
                <p className="text-gray-500">Aquí está tu resumen de entrenamiento.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide uppercase">Entrenamientos 7 días</h3>
                    <p className="text-4xl font-extrabold text-black">{workoutsLast7Days}</p>
                </div>
                <div className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide uppercase">Volumen Total</h3>
                    <p className="text-4xl font-extrabold text-black flex items-baseline gap-1">
                        {totalVolume.toLocaleString()} <span className="text-lg font-medium text-gray-400">kg</span>
                    </p>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Actividad Reciente</h2>
                    <Link href="/entrenamientos" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        Ver e Ingresar Data <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentWorkouts.length === 0 ? (
                        <div className="col-span-full border border-dashed rounded-xl p-12 text-center text-gray-500 bg-gray-50/50">
                            Aún no tienes actividad. ¡Registra tu primer entrenamiento!
                        </div>
                    ) : (
                        recentWorkouts.map(w => (
                            <div key={w.id} className="border p-5 rounded-xl shadow-sm bg-white hover:border-gray-300 transition-colors">
                                <div className="font-semibold text-gray-900 border-b pb-3 mb-3">{w.fecha.toLocaleDateString()}</div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    {w.exercises.length > 0 ? w.exercises.map(ex => (
                                        <div key={ex.id} className="flex justify-between">
                                            <span className="truncate pr-2">{ex.nombre}</span>
                                            <span className="font-medium shrink-0">{ex.series}x{ex.repeticiones}</span>
                                        </div>
                                    )) : (
                                        <span>Sin ejercicios registrados</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <AiSuggestion />
        </div>
    );
}
