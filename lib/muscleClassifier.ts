import { db } from "@/db";
import { exerciseCatalog } from "@/db/schema";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";


export async function classifyExercise(descripcionEjercicio: string) {
  // 1. Obtenemos el catálogo actual para dárselo como contexto / ejemplos a la IA
  const currentCatalog = await db
    .select({
      nombre: exerciseCatalog.nombreNormalizado,
      grupo: exerciseCatalog.grupoMuscular,
      actividad: exerciseCatalog.actividad,
    })
    .from(exerciseCatalog);

  // 2. Llamamos a la IA pasándole el catálogo existente
  const result = await generateText({
    model: google("gemini-3.1-flash-lite"),
    system: `Eres un experto analista de datos de fitness. Tu trabajo es recibir un nombre de ejercicio o actividad ingresado por un usuario y normalizarlo.
    
    Tienes acceso al catálogo actual de la aplicación para usarlo como guía de estilo y consistencia:
    ${JSON.stringify(currentCatalog, null, 2)}
    
    Tus tareas obligatorias son:
    1. Analizar el texto ingresado y extraer el nombre del ejercicio o actividad principal, ignorando cualquier detalle adicional (ej: "press de banca con barra" -> "press de banca").   
    2. Limpiar el resto del texto para obtener el 'nombreEstandarizado' real del ejercicio en minúsculas y sin errores ortográficos.
    3. Si el 'nombreEstandarizado' resultante coincide semánticamente con alguno del catálogo actual, adopta EXACTAMENTE ese nombre para mantener la consistencia.
    4. Clasificar el grupo muscular principal y el tipo de actividad de forma coherente con el catálogo provisto.
    
    ⚠️ REGLA DE NEGOCIO CRÍTICA:
    Deportes o actividades recreativas (ej: "fútbol 5", "pádel", "natación") NO se combinan con ejercicios tradicionales de gimnasio. Deben quedar con su propio nombre estandarizado (ej: "fútbol 5"), actividad: 'cardio' y grupo muscular apropiado (ej: 'piernas' o 'fullbody').`,
    prompt: `Texto ingresado por el usuario a clasificar: "${descripcionEjercicio}"`,
    output: Output.object({
      schema: z.object({
        nombreEstandarizado: z.string().describe("El nombre limpio del ejercicio en minúsculas"),
        grupoMuscular: z.string().describe("Grupo muscular principal"),
        actividad: z.enum(["musculacion", "cardio", "estiramiento", "movilidad"]),
      }),
    }),
  });

  if (!result.output) {
    throw new Error("La IA no pudo procesar la clasificación del ejercicio.");
  }

  return result.output;
}

//CREATE A Zod schema for the muscle group and activity based on the current database values
const exerciseGroups = await db
  .selectDistinct({ 
    grupoMuscular: exerciseCatalog.grupoMuscular, 
    actividad: exerciseCatalog.actividad 
  })
  .from(exerciseCatalog);

// 2. Map the database objects to unique, flat string arrays
// (Using Set ensures we don't have duplicates if the combinations overlap)
const validMuscleGroups = Array.from(new Set(
  exerciseGroups.map(row => row.grupoMuscular).filter(Boolean)
));

const validActivities = Array.from(new Set(
  exerciseGroups.map(row => row.actividad).filter(Boolean)
));

// 3. Create the schemas utilizing .refine()
export const exerciseMuscleGroupSchema = z.string().refine(
  (val) => validMuscleGroups.includes(val),
  {
    message: `Invalid muscle group. Must be one of: ${validMuscleGroups.join(", ")}`
  }
);
export const exerciseActivitySchema = z.string().refine(
  (val) => validActivities.includes(val),
  {
    message: `Invalid activity. Must be one of: ${validActivities.join(", ")}`
  }
);