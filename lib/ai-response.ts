import {
  type AIRoutineResponse,
  aiRoutineResponseSchema,
} from "@/lib/schemas/ai-routine";

export type {
  AIRoutineResponse,
  TrainingState,
} from "@/lib/schemas/ai-routine";

export function isAIRoutineResponse(obj: unknown): obj is AIRoutineResponse {
  return aiRoutineResponseSchema.safeParse(obj).success;
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

export function parseAIResponse(text: string): AIRoutineResponse | null {
  const sanitized = sanitizeJSON(text);
  console.log("---- AI response parsing start ----");
  console.log("Sanitized AI response:", sanitized);
  let parsed: unknown = null;

  try {
    parsed = JSON.parse(sanitized);
    console.log("Parsed AI response:", parsed);
  } catch {
    // Fallback: extraer el primer objeto JSON del texto
    const match = sanitized.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
        console.log("Fallback Parsed AI response:", parsed);
      } catch {
        console.error("Failed to parse fallback AI response");
        console.log("---- AI response parsing end ----");
        return null;
      }
    }
  }
  console.log("---- AI response parsing end ----");
  return isAIRoutineResponse(parsed) ? parsed : null;
}

export function formatAIResponseForUI(data: AIRoutineResponse): string {
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
