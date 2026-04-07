export interface TrainingState {
  last_focus: string;
  weekly_balance: string;
  fatigue_level: "bajo" | "medio" | "alto";
  recommendation_next: string;
}

export interface AIResponse {
  resumen: string;
  rutina: {
    grupo: string;
    justificacion: string;
    ejercicios: {
      nombre: string;
      series: number;
      reps: number;
    }[];
  };
  training_state: TrainingState;
}

function isAIResponse(obj: unknown): obj is AIResponse {
  if (typeof obj !== "object" || obj === null) return false;

  const o = obj as Record<string, unknown>;

  if (
    typeof o.resumen !== "string" ||
    typeof o.rutina !== "object" ||
    o.rutina === null ||
    typeof o.training_state !== "object" ||
    o.training_state === null
  ) {
    return false;
  }

  const ts = o.training_state as Record<string, unknown>;

  return (
    typeof ts.last_focus === "string" &&
    typeof ts.weekly_balance === "string" &&
    typeof ts.fatigue_level === "string" &&
    typeof ts.recommendation_next === "string"
  );
}

export function parseAIResponse(text: string): AIResponse | null {
  let parsed: unknown = null;

  // 1️⃣ intento directo
  try {
    parsed = JSON.parse(text);
  } catch {
    // 2️⃣ fallback: extraer JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }

  // 3️⃣ validar estructura
  if (isAIResponse(parsed)) {
    return parsed;
  }

  return null;
}