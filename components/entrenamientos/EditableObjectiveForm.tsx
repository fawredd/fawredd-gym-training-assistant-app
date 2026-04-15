"use client";

import { useState } from "react";
import Link from "next/link";
const objectivePlaceHolder = `
OBJETIVO DE ENTRENAMIENTO

Completa lo que puedas. Si algo no lo sabes, déjalo en blanco.

━━━━━━━━━━━━━━━━━━
TU CONTEXTO ACTUAL

Edad:
Peso:
Altura:
Contextura física: (delgada / media / robusta)

Actividad deportiva actual (si haces):
Deporte:
Frecuencia semanal:
Duración por sesión:

Disponibilidad para gimnasio:
Días que puedes entrenar:
Tiempo por sesión aproximado:

━━━━━━━━━━━━━━━━━━
TU OBJETIVO PRINCIPAL

Describe qué quieres lograr y por qué.
Ejemplos: ganar músculo, perder grasa, mejorar resistencia, rendir mejor en tu deporte, evitar lesiones, etc.

Objetivos específicos y medibles (muy importante)
Ejemplos:
• Lograr ___ flexiones (ej: 3x15)
• Lograr ___ con rueda abdominal (ej: 3x15)
• Bajar grasa abdominal / mejorar definición
• Fortalecer: piernas / core / espalda / tren superior

Escribe tus objetivos medibles:
-

━━━━━━━━━━━━━━━━━━
TU PUNTO DE PARTIDA

Hoy puedo hacer:
Ej: 3x7 flexiones, 30s plancha, etc.

Limitaciones actuales:
Ej: poca fuerza, baja resistencia, falta de técnica, etc.

Lesiones o zonas a cuidar:
Ej: lumbares, rodillas, hombros, ninguna, etc.

━━━━━━━━━━━━━━━━━━
PREFERENCIAS DE ENTRENAMIENTO

Ejemplos:
• No repetir músculos en días consecutivos
• Entrenar todo el cuerpo durante la semana
• Combinar tren superior, inferior y core

Escribe tus preferencias:
-

━━━━━━━━━━━━━━━━━━
IMPORTANTE

Quiero que las rutinas se adapten a mi progreso y a mi historial de entrenamiento para que sean desafiantes pero seguras.`

export default function EditableObjectiveForm({
  initial,
}: {
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? objectivePlaceHolder);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/objective", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      if (res.ok) {
        // reload
        window.location.href = "/dashboard";
      } else {
        alert("Error guardando objetivo");
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando objetivo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="w-full flex flex-col flex-1 px-4 md:px-8 max-w-3xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {initial ? "Editar objetivo" : "Agregar objetivo"}
        </h1>
        <Link href="/dashboard" className="text-sm ">
          ← Volver
        </Link>
      </div>
      <div className="flex flex-col rounded-xl flex-1">
        <label className="block text-sm font-medium  mb-2">
          Objetivo (descriptivo)
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full flex-1 p-3 rounded border border-border resize-none overflow-y-auto"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded bg-primary text-primary-foreground px-4 py-2"
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
