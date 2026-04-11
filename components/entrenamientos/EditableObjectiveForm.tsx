"use client";

import { useState } from "react";
import Link from "next/link";
const objectivePlaceHolder = `
    Ejemplo de objetivo de entrenamiento

    Edad: [tu edad]
    Peso: [tu peso]
    Altura: [tu altura]
    Contextura física: [delgada / media / robusta]

    Actividad deportiva actual
    - Practico: [deporte]
    - Frecuencia semanal: [días y duración]

    Disponibilidad para gimnasio
    - Días de entrenamiento: [ej: lunes a viernes]

    Objetivo principal
    Describe qué quieres lograr y por qué.
    Ej: mejorar rendimiento deportivo, evitar lesiones, ganar masa muscular, perder grasa, mejorar resistencia, etc.

    Objetivos específicos y medibles (muy importante)
    Ejemplos:
    - Lograr X repeticiones de flexiones: [ej: 3x15]
    - Lograr X repeticiones con rueda abdominal: [ej: 3x15 con buena extensión]
    - Reducir grasa abdominal / mejorar definición muscular
    - Fortalecer [piernas / core / espalda / tren superior]

    Estado actual (tu punto de partida)
    Ej:
    - Hoy puedo hacer: [ej: 3x7 flexiones]
    - Limitaciones actuales: [ej: poca fuerza abdominal]

    Lesiones o zonas a cuidar
    Ej: problemas lumbares, rodillas, hombros, etc.

    Preferencias de entrenamiento
    Ejemplos:
    - No repetir grupos musculares en días consecutivos
    - Entrenar todos los grupos musculares durante la semana
    - Combinar tren inferior, superior y core cuando sea conveniente

    Importante
    Quiero que las próximas rutinas se adapten a mi progreso y a mi historial de entrenamiento para que sean desafiantes pero seguras.`

export default function EditableObjectiveForm({
  initial,
}: {
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
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
          placeholder={objectivePlaceHolder}
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
