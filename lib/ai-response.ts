export interface TrainingState {
  priority_goals: string;
  secondary_goals: string;
  progression_focus: string;
  weak_areas: string;
  recovery_notes: string;
  weekly_strategy: string;
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
      reps: number | string;
      duracion: number | string; // ← el modelo libre devuelve "45 segundos" o 5
      peso: number | string; // ← el modelo libre devuelve "20 kg" o 20
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
  )
    return false;

  const ts = o.training_state as Record<string, unknown>;
  return (
    typeof ts.priority_goals === "string" &&
    typeof ts.secondary_goals === "string" &&
    typeof ts.progression_focus === "string" &&
    typeof ts.weak_areas === "string" &&
    typeof ts.recovery_notes === "string" &&
    typeof ts.weekly_strategy === "string" &&
    typeof ts.recommendation_next === "string" &&
    typeof ts.user_traning_evolution_analysis === "string"
  );
}

function sanitizeJSON(raw: string): string {
  // 1. Quitar fences de markdown (```json ... ``` o ``` ... ```)
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // 2. El modelo a veces devuelve \n literales como string escaped — normalizar
  text = text.replace(/\\n/g, "\n");

  // 3. Parchear valores inválidos: número seguido de texto sin comillas
  //    e.g.  "reps": 45 segundos  →  "reps": "45 segundos"
  text = text.replace(
    /("(?:reps|series)")\s*:\s*(\d[\d\s]*[a-záéíóúüñ]+[^",\n\}]*)/gi,
    (_, key, val) => `${key}: "${val.trim()}"`,
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
    .map((ex) => {
      let detalle = "";

      // 1. Si es un ejercicio basado en tiempo (isométricos como planchas)
      if (ex.duracion && ex.duracion != 0) {
        // Usamos las series y la duración en segundos
        detalle = `${ex.series}x${ex.duracion}s`;
      } 
      // 2. Si es un ejercicio de repeticiones tradicionales
      else {
        detalle = `${ex.series}x${ex.reps}`;
      }

      // 3. Si además incluye peso (mayor a 0), se lo agregamos al final
      if (ex.peso && ex.peso != 0) {
        detalle += ` @ ${ex.peso}kg`;
      }

      return `• ${ex.nombre}: ${detalle}`;
    })
    .join("\n");

  return `${data.resumen}

Rutina del día:
Grupo: ${data.rutina.grupo}
${data.rutina.justificacion}

Ejercicios:
${ejercicios}`;
}
