import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WorkoutForm from './WorkoutForm';
import AiWorkoutForm from './AiWorkoutForm';
import { db } from '../../db';
import { workouts, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import DeleteWorkoutButton from './DeleteWorkoutButton';

export default async function EntrenamientosPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });

    if (!existingUser) {
        return (
            <div className="p-8 text-center">
                Iniciando tu perfil. Por favor, asegúrate de visitar el Dashboard primero.{' '}
                <Link href="/dashboard" className="text-primary underline">Ir al Dashboard</Link>
            </div>
        );
    }

    const userWorkouts = await db.query.workouts.findMany({
        where: eq(workouts.userId, existingUser.id),
        orderBy: [desc(workouts.fecha)],
        with: {
            exercises: true
        }
    });

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Mis Entrenamientos</h1>
                <Link href="/dashboard" className="text-sm text-primary font-medium hover:underline">← Volver al Dashboard</Link>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-primary/20">
                        <h2 className="text-xl font-semibold flex items-center mb-6 text-primary">
                            Carga Mágica Acelerada (IA) ✨
                        </h2>
                        <AiWorkoutForm />
                    </div>
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <h2 className="text-xl font-semibold mb-6">Carga Manual Clásica</h2>
                        <WorkoutForm />
                    </div>
                </div>

                <div>
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
                                <p className="text-muted-foreground">No tienes entrenamientos registrados aún.</p>
                            </div>
                        ) : (
                            userWorkouts.map(w => (
                                <div key={w.id} className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
                                        <p className="font-semibold text-lg">{w.fecha.toLocaleDateString()}</p>
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
                                        {w.exercises.map(ex => (
                                            <li key={ex.id} className="flex justify-between items-center">
                                                <span className="font-medium">{ex.nombre}</span>
                                                <span className="text-muted-foreground">
                                                    {ex.duracionSegundos && ex.duracionSegundos > 0
                                                        ? <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{ex.duracionSegundos}s</span>
                                                        : <>{ex.series}x{ex.repeticiones} <span className="text-muted-foreground">|</span> {ex.peso}kg</>
                                                    }
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
