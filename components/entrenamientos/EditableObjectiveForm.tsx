"use client";

import { useState } from "react";
import Link from "next/link";

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
