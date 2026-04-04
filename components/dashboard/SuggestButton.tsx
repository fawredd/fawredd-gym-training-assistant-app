"use client";

import React, { useState } from "react";

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
      // Try to parse JSON, fall back to text
      let data: any;
      try {
        data = await res.json();
      } catch (e) {
        data = await res.text();
      }

      const content = data?.contenido ?? data?.memory ?? data ?? null;

      // If content is a string that looks like JSON, parse it to show readable text
      let parsed: string | null = null;
      if (typeof content === "string") {
        const txt = content.trim();
        if (txt.startsWith("{") || txt.startsWith("[")) {
          try {
            const obj = JSON.parse(txt);
            // Prefer common text fields if present
            parsed =
              obj?.contenido ||
              obj?.content ||
              obj?.message ||
              obj?.text ||
              // Fallback: pretty-print object to multiple lines
              JSON.stringify(obj, null, 2);
          } catch (e) {
            parsed = content;
          }
        } else {
          parsed = content;
        }
      } else if (typeof content === "object" && content !== null) {
        // Prefer obvious text fields
        parsed =
          content?.contenido ||
          content?.content ||
          content?.message ||
          content?.text ||
          JSON.stringify(content, null, 2);
      } else {
        parsed = content ? String(content) : null;
      }

      setMessage(parsed);
      try {
        window.dispatchEvent(
          new CustomEvent("ai:suggestion", {
            detail: { contenido: parsed, fecha: new Date().toISOString() },
          }),
        );
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setMessage("Error de red");
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
