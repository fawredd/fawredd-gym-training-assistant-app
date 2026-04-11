export interface TrainingState {
  last_focus: string;
  weekly_balance: string;
  fatigue_level: "bajo" | "medio" | "alto";
  recommendation_next: string;
  user_traning_evolution_analysis: string;
}

export interface AIResponse {
  resumen: string;
  rutina: {
    grupo: string;
    justificacion: string;
    ejercicios: {
      nombre: string;
      series: number;
      reps: number | string; // ← el modelo libre devuelve "45 segundos" o 5
    }[];
  };
  training_state: TrainingState;
}

function isAIResponse(obj: unknown): obj is AIResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;

  if (
    typeof o.resumen !== "string" ||
    typeof o.rutina !== "object" || o.rutina === null ||
    typeof o.training_state !== "object" || o.training_state === null
  ) return false;

  const ts = o.training_state as Record<string, unknown>;
  return (
    typeof ts.last_focus === "string" &&
    typeof ts.weekly_balance === "string" &&
    typeof ts.fatigue_level === "string" &&
    typeof ts.recommendation_next === "string" &&
    typeof ts.user_traning_evolution_analysis === "string"
  );
}

function sanitizeJSON(raw: string): string {
  // 1. Quitar fences de markdown (```json ... ``` o ``` ... ```)
  let text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // 2. El modelo a veces devuelve \n literales como string escaped — normalizar
  text = text.replace(/\\n/g, "\n");

  // 3. Parchear valores inválidos: número seguido de texto sin comillas
  //    e.g.  "reps": 45 segundos  →  "reps": "45 segundos"
  text = text.replace(
    /("(?:reps|series)")\s*:\s*(\d[\d\s]*[a-záéíóúüñ]+[^",\n\}]*)/gi,
    (_, key, val) => `${key}: "${val.trim()}"`
  );

  return text;
}

export function parseAIResponse(text: string): AIResponse | null {
  const sanitized = sanitizeJSON(text);
  let parsed: unknown = null;

  try {
    parsed = JSON.parse(sanitized);
  } catch {
    // Fallback: extraer el primer objeto JSON del texto
    const match = sanitized.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  return isAIResponse(parsed) ? parsed : null;
}

export function formatAIResponseForUI(data: AIResponse): string {
  const ejercicios = data.rutina.ejercicios
    .map((ex) => `• ${ex.nombre}: ${ex.series}x${ex.reps}`)
    .join("\n");

  return `${data.resumen}

Rutina del día:
Grupo: ${data.rutina.grupo}
${data.rutina.justificacion}

Ejercicios:
${ejercicios}`;
}