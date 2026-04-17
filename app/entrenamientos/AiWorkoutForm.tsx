"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';

export default function AiWorkoutForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt || !referenceDate) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/workouts/etl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, referenceDate }),
            });

            if (res.ok) {
                setPrompt("");
                router.refresh();
            } else {
                alert("Error al procesar el texto con IA.");
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
                <Label htmlFor="refDate">Fecha de Referencia (Base para la IA)</Label>
                <Input
                    type="date"
                    id="refDate"
                    required
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(format(parseISO(e.target.value), 'yyyy-MM-dd'))}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="prompt">Describe tus entrenamientos (días o semanas)</Label>
                <textarea
                    id="prompt"
                    required
                    rows={5}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Ayer lunes hice pecho: press banca 4x10 con 60kg. Hoy martes hice core: plancha frontal 3 series de 30 segundos cada una."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Asegúrate de indicar de alguna manera cuándo fue tu entreno ("ayer", "el sábado", "15 de marzo"). Si omites la fecha, se usará la Fecha de Referencia.
                </p>
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
            >
                {isSubmitting ? 'Procesando y Guardando (IA)...' : 'Analizar y Cargar Magicamente ✨'}
            </Button>
        </form>
    );
}
