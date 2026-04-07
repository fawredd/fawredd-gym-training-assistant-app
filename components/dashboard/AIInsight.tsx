"use client";

import { useEffect, useState } from "react";
import { SuggestButton } from "./SuggestButton";

interface AIInsightProps {
  contenido: string | null;
  fecha: string | null;
}

export function AIInsight({
  contenido: initialContenido,
  fecha: initialFecha,
}: AIInsightProps) {
  const [contenido, setContenido] = useState<string | null>(
    initialContenido ?? null,
  );
  const [fecha, setFecha] = useState<Date | null>(
    initialFecha ? new Date(initialFecha) : null,
  );

  useEffect(() => {
    interface MiEventoDetail {
      contenido: string | null;
      fecha: string | null;
    }
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<MiEventoDetail>;
      const detail = custom.detail;

      // Si detail no existe o no tiene la estructura, salimos
      if (!detail) { 
        console.log("Evento recibido sin detalle válido:", ev);
        return;
      }

      setContenido(detail.contenido ?? null);
      setFecha(detail.fecha ? new Date(detail.fecha) : new Date());
    };

    window.addEventListener("ai:suggestion", handler as EventListener);
    return () =>
      window.removeEventListener("ai:suggestion", handler as EventListener);
  }, []);

  return (
    <div className="mx-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          🤖 Ayuda Memoria (IA)
        </h2>
        {fecha && (
          <span className="text-xs text-muted-foreground">
            {fecha.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      {contenido ? (
        <div className="text-sm text-foreground leading-relaxed space-y-2">
          {contenido
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no generaste una ayuda memoria. Cargá entrenamientos y generá tu
          primera recomendación.
        </p>
      )}
      {/* Suggest button shown only inside AIInsight */}
      <SuggestButton />
    </div>
  );
}
