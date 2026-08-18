"use client";

import { AIRoutineResponse, formatAIResponseForUI } from "@/lib/ai-response";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

export function SuggestButton() {
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  const STATUS_MESSAGES: Record<number, string> = {
    400: "La solicitud no pudo identificarse correctamente. Intentá de nuevo.",
    401: "Tu sesión expiró. Por favor, volvé a iniciar sesión.",
    404: "No encontramos tu perfil. Contactá soporte.",
    409: "Ya hay una sugerencia en proceso. Esperá unos segundos e intentá nuevamente.",
    422: "La respuesta de la IA no pudo procesarse. Intentá de nuevo.",
    429: "Límite de solicitudes alcanzado. Esperá un momento.",
    500: "Error interno. Intentá de nuevo más tarde.",
  };

  async function handleClick() {
    if (loading) return;

    const idempotencyKey = requestIdRef.current ?? crypto.randomUUID();
    requestIdRef.current = idempotencyKey;
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });

      if (!res.ok) {
        toast.info(
          STATUS_MESSAGES[res.status] ?? "Ocurrió un error inesperado.",
        );
        return;
      }

      const parsed = (await res.json()) as AIRoutineResponse;
      const contenido = formatAIResponseForUI(parsed);

      window.dispatchEvent(
        new CustomEvent("ai:suggestion", {
          detail: {
            contenido,
            fecha: new Date().toISOString(),
          },
        }),
      );
    } catch {
      toast.info("No se pudo conectar. Verificá tu conexión.");
    } finally {
      setLoading(false);
      requestIdRef.current = null;
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
    </div>
  );
}
