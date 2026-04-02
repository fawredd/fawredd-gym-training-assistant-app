"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Exercise {
    nombre: string;
    series: number;
    repeticiones: number;
    peso: number;
}

interface EditableWorkoutFormProps {
    workoutId: string;
    initialFecha: string; // YYYY-MM-DD
    initialExercises: Exercise[];
    mode: "edit" | "create";
}

export default function EditableWorkoutForm({
    workoutId,
    initialFecha,
    initialExercises,
    mode,
}: EditableWorkoutFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fecha, setFecha] = useState(initialFecha);
    const [ejercicios, setEjercicios] = useState<Exercise[]>(
        initialExercises.length > 0
            ? initialExercises
            : [{ nombre: "", series: 3, repeticiones: 10, peso: 0 }]
    );

    const handleAddExercise = () => {
        setEjercicios([...ejercicios, { nombre: "", series: 3, repeticiones: 10, peso: 0 }]);
    };

    const handleExerciseChange = (index: number, field: string, value: string | number) => {
        const updated = [...ejercicios];
        updated[index] = { ...updated[index], [field]: value };
        setEjercicios(updated);
    };

    const handleRemoveExercise = (index: number) => {
        setEjercicios(ejercicios.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fecha) return;

        setIsSubmitting(true);
        try {
            const url =
                mode === "edit" ? `/api/workouts/${workoutId}` : "/api/workouts";
            const method = mode === "edit" ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fecha, ejercicios }),
            });

            if (res.ok) {
                router.push("/entrenamientos");
                router.refresh();
            } else {
                alert("Error al guardar entrenamiento.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Seguro que querés eliminar este entrenamiento?")) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/entrenamientos");
                router.refresh();
            } else {
                alert("Error al eliminar.");
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
                    onChange={(e) => setFecha(e.target.value)}
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
                                <Input
                                    id={`nombre-${i}`}
                                    type="text"
                                    required
                                    value={ex.nombre}
                                    onChange={(e) => handleExerciseChange(i, "nombre", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor={`series-${i}`}>Series</Label>
                                    <Input
                                        id={`series-${i}`}
                                        type="number"
                                        required
                                        min="1"
                                        value={ex.series}
                                        onChange={(e) => handleExerciseChange(i, "series", parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`reps-${i}`}>Reps</Label>
                                    <Input
                                        id={`reps-${i}`}
                                        type="number"
                                        required
                                        min="0"
                                        value={ex.repeticiones}
                                        onChange={(e) =>
                                            handleExerciseChange(i, "repeticiones", parseInt(e.target.value))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`peso-${i}`}>Peso(kg)</Label>
                                    <Input
                                        id={`peso-${i}`}
                                        type="number"
                                        required
                                        min="0"
                                        value={ex.peso}
                                        onChange={(e) =>
                                            handleExerciseChange(i, "peso", parseFloat(e.target.value))
                                        }
                                    />
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

            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting
                    ? "Guardando..."
                    : mode === "edit"
                        ? "Actualizar Entrenamiento"
                        : "Guardar Entrenamiento"}
            </Button>

            {mode === "edit" && (
                <Button
                    type="button"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={handleDelete}
                    className="w-full"
                >
                    🗑️ Eliminar Entrenamiento
                </Button>
            )}
        </form>
    );
}
