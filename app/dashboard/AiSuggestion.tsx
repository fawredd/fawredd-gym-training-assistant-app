"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AiSuggestion() {
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateSuggestion = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/ai", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setSuggestion(data.suggestion);
            } else if (res.status === 429) {
                setError("Límite de solicitudes alcanzado (rate limit). Intenta en 12 horas.");
            } else {
                setError("Error al generar la sugerencia.");
            }
        } catch (e) {
            setError("Error de red.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl shadow-sm mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold tracking-tight text-indigo-900">Ayuda Memoria (IA)</h2>
                <Button
                    onClick={generateSuggestion}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isLoading ? "Generando..." : "Sugerir Entrenamiento"}
                </Button>
            </div>

            {error && <p className="text-red-500 text-sm font-medium mb-4">{error}</p>}

            {suggestion ? (
                <div className="prose prose-sm max-w-none text-gray-800 bg-white p-4 rounded-lg border border-indigo-100 shadow-inner">
                    {suggestion.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 leading-relaxed">{line}</p>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-indigo-700/70">
                    Calcula tu próxima sesión de entrenamiento ideal basándote en tu objetivo y desempeño de los últimos 7 días.
                </p>
            )}
        </div>
    );
}
