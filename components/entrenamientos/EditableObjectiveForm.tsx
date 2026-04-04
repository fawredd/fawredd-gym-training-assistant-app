"use client";

import { useState } from "react";
import Link from "next/link";
import { Form } from "@base-ui/react/form";

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
      className="w-full h-lvh px-4 md:px-8 max-w-3xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {initial ? "Editar objetivo" : "Agregar objetivo"}
        </h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground">
          ← Volver
        </Link>
      </div>
      <div className="bg-card rounded-xl h-full">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Objetivo (texto corto)
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-full p-3 rounded border border-border"
          rows={4}
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
