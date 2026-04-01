import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WorkoutForm from './WorkoutForm';
import { db } from '../../db';
import { workouts, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function EntrenamientosPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });

    if (!existingUser) {
        return <div className="p-8 text-center">Iniciando tu perfil. Por favor, asegúrate de visitar The Dashboard primero. <Link href="/dashboard" className="text-blue-500">Ir al Dashboard</Link></div>
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
                <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">← Volver al Dashboard</Link>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-6">Registrar Nuevo Entrenamiento</h2>
                    <WorkoutForm />
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-6">Historial</h2>
                    <div className="space-y-4">
                        {userWorkouts.length === 0 ? (
                            <div className="bg-gray-50 text-center p-8 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">No tienes entrenamientos registrados aún.</p>
                            </div>
                        ) : (
                            userWorkouts.map(w => (
                                <div key={w.id} className="bg-white border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center border-b pb-3 mb-3">
                                        <p className="font-semibold text-lg">{w.fecha.toLocaleDateString()}</p>
                                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {w.exercises.length} ejercicios
                                        </span>
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        {w.exercises.map(ex => (
                                            <li key={ex.id} className="flex justify-between items-center">
                                                <span className="font-medium">{ex.nombre}</span>
                                                <span className="text-gray-500">
                                                    {ex.series}x{ex.repeticiones} <span className="text-gray-400">|</span> {ex.peso}kg
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
