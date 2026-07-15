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


export interface AIRoutineResponse {
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

export function isAIRoutineResponse(obj: unknown): obj is AIRoutineResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;

  // 1. Validar la raíz ("resumen" y "rutina")
  if (
    typeof o.resumen !== "string" ||
    typeof o.rutina !== "object" ||
    o.rutina === null
  ) {
    return false;
  }

  const rutina = o.rutina as Record<string, unknown>;

  // 2. Validar los campos de "rutina" ("grupo", "justificacion" y "ejercicios")
  if (
    typeof rutina.grupo !== "string" ||
    typeof rutina.justificacion !== "string" ||
    !Array.isArray(rutina.ejercicios)
  ) {
    return false;
  }

  // 3. Validar que cada ejercicio tenga la estructura correcta (opcional pero muy recomendado)
  const ejerciciosValidos = rutina.ejercicios.every((ej: unknown) => {
    if (typeof ej !== "object" || ej === null) return false;
    const e = ej as Record<string, unknown>;
    return (
      typeof e.nombre === "string" &&
      typeof e.series === "number" &&
      typeof e.reps === "number" &&
      typeof e.duracion === "number" &&
      typeof e.peso === "number"
    );
  });

  return ejerciciosValidos;
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
