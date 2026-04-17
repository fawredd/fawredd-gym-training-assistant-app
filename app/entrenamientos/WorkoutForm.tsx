"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {format, parseISO} from 'date-fns'

export default function WorkoutForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [ejercicios, setEjercicios] = useState([
        { nombre: '', series: 3, repeticiones: 0, peso: 0, duracionSegundos: 0 },
    ]);

    const handleAddExercise = () => {
        setEjercicios([...ejercicios, { nombre: '', series: 3, repeticiones: 0, peso: 0, duracionSegundos: 0 }]);
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
                setEjercicios([{ nombre: '', series: 3, repeticiones: 0, peso: 0, duracionSegundos: 0 }]);
                router.refresh();
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
            <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                    id="fecha"
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(format(parseISO(e.target.value), 'yyyy-MM-dd'))}
                />
            </div>

            <div className="space-y-4">
                <Label>Ejercicios</Label>

                {ejercicios.map((ex, i) => (
                    <Card key={i} className="relative shadow-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => handleRemoveExercise(i)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                            ×
                        </Button>
                        <CardContent className="pt-6 grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`nombre-${i}`}>Nombre (ej. Press Banca)</Label>
                                <Input id={`nombre-${i}`} type="text" required value={ex.nombre} onChange={(e) => handleExerciseChange(i, 'nombre', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor={`series-${i}`}>Series</Label>
                                    <Input id={`series-${i}`} type="number" required min="0" value={ex.series} onChange={(e) => handleExerciseChange(i, 'series', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`reps-${i}`}>Reps</Label>
                                    <Input id={`reps-${i}`} type="number" required min="0" value={ex.repeticiones} onChange={(e) => handleExerciseChange(i, 'repeticiones', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`peso-${i}`}>Peso(kg)</Label>
                                    <Input id={`peso-${i}`} type="number" required min="0" value={ex.peso} onChange={(e) => handleExerciseChange(i, 'peso', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`duracion-${i}`}>Duración(seg)</Label>
                                    <Input id={`duracion-${i}`} type="number" required min="0" value={ex.duracionSegundos} onChange={(e) => handleExerciseChange(i, 'duracionSegundos', parseFloat(e.target.value))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button
                    variant="outline"
                    type="button"
                    onClick={handleAddExercise}
                    className="w-full border-dashed"
                >
                    + Agregar Ejercicio
                </Button>
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Entrenamiento'}
            </Button>
        </form>
    );
}
