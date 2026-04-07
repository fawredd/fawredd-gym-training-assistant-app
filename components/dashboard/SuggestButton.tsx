"use client";

import { AIResponse, parseAIResponse } from "@/lib/ai-response";
import React, { useState } from "react";

function formatAIResponseForUI(data: AIResponse): string {
  const ejercicios = data.rutina.ejercicios
    .map(
      (ex) => `• ${ex.nombre}: ${ex.series}x${ex.reps}`
    )
    .join("\n");

  return `${data.resumen}

Rutina del día:
Grupo: ${data.rutina.grupo}
${data.rutina.justificacion}

Ejercicios:
${ejercicios}`;
}

export function SuggestButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
      try {
        const res = await fetch("/api/ai", { method: "POST" });

        if (res.status === 429) {
          setMessage("Límite de solicitudes alcanzado");
          return;
        }

        if (!res.ok) {
          const txt = await res.text();
          setMessage(`Error: ${txt}`);
          return;
        }

        const text = await res.text();

        const parsed = parseAIResponse(text);

        const contenido = parsed
          ? formatAIResponseForUI(parsed)
          : text

        window.dispatchEvent(
          new CustomEvent("ai:suggestion", {
            detail: {
              contenido,
              fecha: new Date().toISOString(),
            },
          })
        );
      } catch (e) {
        setMessage("Error inesperado");
      } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg py-3 shadow-lg active:scale-95 transition-transform disabled:opacity-60"
      >
        <span className="text-2xl">💡</span>
        {loading ? "Generando..." : "Sugerir Entrenamiento"}
      </button>
      {message && (
        <div className="mt-2 text-sm text-center text-foreground">
          {message}
        </div>
      )}
    </div>
  );
}
