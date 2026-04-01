"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkoutForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ejercicios, setEjercicios] = useState([
        { nombre: '', series: 3, repeticiones: 10, peso: 0 }
    ]);

    const handleAddExercise = () => {
        setEjercicios([...ejercicios, { nombre: '', series: 3, repeticiones: 10, peso: 0 }]);
    };

    const handleExerciseChange = (index: number, field: string, value: string | number) => {
        const newExercises = [...ejercicios];
        newExercises[index] = { ...newExercises[index], [field]: value };
        setEjercicios(newExercises);
    };

    const handleRemoveExercise = (index: number) => {
        const newExercises = ejercicios.filter((_, i) => i !== index);
        setEjercicios(newExercises);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fecha) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha, ejercicios }),
            });

            if (res.ok) {
                setEjercicios([{ nombre: '', series: 3, repeticiones: 10, peso: 0 }]);
                router.refresh(); // Refresh page data
            } else {
                alert("Error al guardar entrenamiento");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-black focus:border-black"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Ejercicios</label>
                </div>

                {ejercicios.map((ex, i) => (
                    <div key={i} className="flex flex-col gap-3 p-4 bg-gray-50 border rounded-md relative">
                        <button
                            type="button"
                            onClick={() => handleRemoveExercise(i)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold"
                        >×</button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre (ej. Press Banca)</label>
                                <input type="text" required value={ex.nombre} onChange={(e) => handleExerciseChange(i, 'nombre', e.target.value)} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Series</label>
                                    <input type="number" required min="1" value={ex.series} onChange={(e) => handleExerciseChange(i, 'series', parseInt(e.target.value))} className="w-full px-2 py-1.5 border rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Reps</label>
                                    <input type="number" required min="1" value={ex.repeticiones} onChange={(e) => handleExerciseChange(i, 'repeticiones', parseInt(e.target.value))} className="w-full px-2 py-1.5 border rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Peso(kg)</label>
                                    <input type="number" required min="0" value={ex.peso} onChange={(e) => handleExerciseChange(i, 'peso', parseFloat(e.target.value))} className="w-full px-2 py-1.5 border rounded-md text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={handleAddExercise}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm"
                >
                    + Agregar Ejercicio
                </button>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-black text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-all shadow-sm"
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Entrenamiento'}
            </button>
        </form>
    );
}
