import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "@/db";
import { workoutExercises } from "@/db/schema";
import { inArray, like } from "drizzle-orm";
import { classifyExercise } from "@/lib/muscleClassifier";

type Row = {
  id: string;
  nombre: string;
  grupo: string;
};

async function main() {
  console.log("🔎 Fetching exercises...");

  const rows: Row[] = await db
    .select({
      id: workoutExercises.id,
      nombre: workoutExercises.nombre,
      grupo: workoutExercises.grupoMuscular,
    })
    .from(workoutExercises)
    .where(like(workoutExercises.grupoMuscular, '%Otro%'));

  console.log(`Rows: ${rows.length}`);

  // 1️⃣ grupos únicos
  const uniqueGroups = [...new Set(rows.map(r => r.grupo))];
  console.log(`Unique groups: ${uniqueGroups.length}`);

  // 2️⃣ nombres únicos
  const uniqueNames = [...new Set(rows.map(r => r.nombre))];
  console.log(`Unique names: ${uniqueNames.length}`);

/*   // 2️⃣ clasificar en paralelo
  console.log("🧠 Classifying exercises...");
  const classifications = await Promise.all(
    uniqueGroups.map(async (name) => ({
      name,
      group: await classifyExercise(name),
    }))
  );

  // 3️⃣ mapa nombre → grupo
  const nameToGroup = new Map<string, string>();
  for (const c of classifications) {
    nameToGroup.set(c.name, c.group);
  }

  // 4️⃣ agrupar IDs por grupo muscular
  const groupToIds = new Map<string, string[]>();

  for (const row of rows) {
    const group = nameToGroup.get(row.nombre)!;

    if (!groupToIds.has(group)) {
      groupToIds.set(group, []);
    }
    groupToIds.get(group)!.push(row.id);
  }

  console.log(`Muscle groups detected: ${groupToIds.size}`);

  // 5️⃣ batch updates 🔥
  let totalUpdated = 0;

  for (const [group, ids] of groupToIds) {
    // postgres no ama IN gigantes → chunk de 500
    const chunkSize = 500;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      await db
        .update(workoutExercises)
        .set({ grupoMuscular: group })
        .where(inArray(workoutExercises.id, chunk));

      totalUpdated += chunk.length;
      console.log(`✏️ Updated ${totalUpdated}/${rows.length}`);
    }
  }
 */  
  
  console.log(`Muscle group "Otros" detected: ${uniqueGroups}`);
  console.log(`Unique names related to 'Otros' groups: ${uniqueNames}`);
  console.log("✅ DONE");
}

main().then(() => process.exit(0));