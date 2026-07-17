import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "@/db";
import { workoutExercises, exerciseCatalog } from "@/db/schema";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main() {
  console.log("🔎 Obteniendo nombres de ejercicios de la DB...");

  // 1. Traemos todos los ejercicios registrados históricamente por los usuarios
  const rows = await db
    .select({
      nombre: workoutExercises.nombre,
    })
    .from(workoutExercises);

  console.log(`Ejercicios totales en la DB: ${rows.length}`);

  // 2. Limpiamos y eliminamos duplicados idénticos en texto plano en memoria
  const uniqueNamesFromHistory = [
    ...new Set(
      rows
        .map((r) => r.nombre.trim().toLowerCase())
        .filter((nombre) => nombre.length > 0)
    ),
  ];

  // 3. ¡AQUÍ SE CONTEMPLA LO YA EXISTENTE! 
  // Traemos lo que ya está catalogado en la base de datos para no duplicar esfuerzos
  console.log("📦 Verificando qué ejercicios ya existen en el catálogo...");
  const existingCatalogItems = await db
    .select({ nombreNormalizado: exerciseCatalog.nombreNormalizado })
    .from(exerciseCatalog);

  // Mantenemos este Set dinámico en memoria para controlar duplicados existentes e inter-lotes
  const existingCatalogSet = new Set(
    existingCatalogItems.map((item) => item.nombreNormalizado)
  );

  // Filtramos la lista: solo enviaremos a la IA lo que NO esté ya en el catálogo
  const uniqueNamesToProcess = uniqueNamesFromHistory.filter(
    (name) => !existingCatalogSet.has(name)
  );

  console.log(`Ejercicios únicos históricos: ${uniqueNamesFromHistory.length}`);
  console.log(`Ejercicios ya catalogados anteriormente: ${existingCatalogSet.size}`);
  console.log(`🚀 Ejercicios PENDIENTES por procesar con IA: ${uniqueNamesToProcess.length}`);

  if (uniqueNamesToProcess.length === 0) {
    console.log("✅ ¡Todo está al día! No hay ejercicios pendientes por catalogar.");
    return;
  }

  // 4. Enviamos los datos a la IA en lotes estructurados
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < uniqueNamesToProcess.length; i += chunkSize) {
    const chunk = uniqueNamesToProcess.slice(i, i + chunkSize);
    console.log(`⏳ Procesando lote ${Math.floor(i / chunkSize) + 1} (ejercicios ${i + 1} a ${Math.min(i + chunkSize, uniqueNamesToProcess.length)})...`);

    try {
      const result = await generateText({
        model: google("gemini-3.1-flash-lite"),
        system: `Eres un experto analista de datos de fitness y bases de datos relacionales. 
        Analiza la lista de cadenas de texto que representan ejercicios registrados por usuarios.
        
        Tu tarea es:
        1. Limpiarlos ortográficamente y unificarlos en un 'nombreEstandarizado' limpio y en minúsculas (sin pesos, series ni repeticiones).
        2. Clasificar su grupo muscular principal (ej. Pecho, Espalda, Bíceps, Tríceps, Piernas, Core, Hombros).
        3. Clasificar su tipo de actividad ('musculacion', 'cardio', 'estiramiento', o 'movilidad').

        ⚠️ REGLAS CRÍTICAS DE NEGOCIO PARA EVITAR PÉRDIDA DE DATOS:
        - Deportes, actividades recreativas o clases grupales (ej: "fútbol 5", "crossfit", "spinning", "natación", "pádel", "fútbol") NO SON DUPLICADOS entre sí ni de ejercicios de gimnasio tradicionales (como "bicicleta" o "extensión de cuádriceps").
        - Si identificas una actividad deportiva como "fútbol 5", el 'nombreEstandarizado' debe mantenerse fiel al deporte original (ej: "fútbol 5" o "fútbol"), clasificado apropiadamente (actividad: 'cardio', grupoMuscular: 'Piernas' o 'Fullbody' según corresponda). No lo fusiones con ejercicios genéricos.`,
        prompt: `Lista de ejercicios a procesar en este lote:\n${JSON.stringify(chunk, null, 2)}`,
        output: Output.object({
          schema: z.object({
            ejercicios: z.array(
              z.object({
                nombreOriginal: z.string().describe("El nombre tal cual te lo envié"),
                nombreEstandarizado: z.string().describe("Nombre corregido, limpio y en minúsculas"),
                grupoMuscular: z.string().describe("Grupo muscular principal"),
                actividad: z.enum(["musculacion", "cardio", "estiramiento", "movilidad"]),
              })
            ),
          }),
        }),
      });

      // 5. Insertamos los resultados controlando colisiones en memoria
      if (result.output?.ejercicios) {
        console.log(`✍️ Guardando ${result.output.ejercicios.length} ejercicios del lote actual...`);
        
        for (const item of result.output.ejercicios) {
          const nombreNorm = item.nombreEstandarizado.trim().toLowerCase();
          
          // CONTROL DE COLISIÓN SEGURO: Si la IA generó un nombre que ya existía en la DB antes de arrancar,
          // o que se insertó en un lote anterior, lo salteamos elegantemente.
          if (existingCatalogSet.has(nombreNorm)) {
            console.log(`⚠️ Omitiendo "${nombreNorm}" porque ya existe en el catálogo.`);
            continue;
          }
          
          try {
            // Corregido: 'nombreNormalizado' mapea exactamente a tu esquema
            await db
              .insert(exerciseCatalog)
              .values({
                id: crypto.randomUUID(),
                nombreNormalizado: nombreNorm,
                grupoMuscular: item.grupoMuscular,
                actividad: item.actividad,
              })
              .onConflictDoNothing({ target: exerciseCatalog.nombreNormalizado });
            
            // Lo agregamos al set para proteger los siguientes inserts del bucle
            existingCatalogSet.add(nombreNorm);
            successCount++;
          } catch (insertError) {
            console.error(`⚠️ No se pudo guardar individualmente "${nombreNorm}":`, insertError);
          }
        }
      }
    } catch (error) {
      console.error(`🚨 Error crítico procesando el lote actual. Se saltará este lote y se continuará con el siguiente.`, error);
    }
  }

  console.log(`\n🎉 PROCESO COMPLETADO.`);
  console.log(`✅ Se procesaron y registraron ${successCount} nuevos ejercicios maestros únicos en esta sesión.`);
}

main().then(() => process.exit(0));