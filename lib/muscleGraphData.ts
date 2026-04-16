// ==============================
// Types
// ==============================

import { classifyExercise } from "./muscleClassifier";
import type { WorkoutExercise } from "@/db/schema";

export  type TrainingProgress = {
  column: number;
  totalMeasure: number;
};

export type ChartData = Record<string, TrainingProgress[]>;

// ==============================
// Helpers
// ==============================

// Asegurate que esto devuelva "YYYY-MM-DD"
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function fillColumns(data: ChartData): ChartData {
  const filledData: ChartData = {};

  const maxColumn = Object.values(data).reduce(
    (max, exercise) => Math.max(...exercise.map(e => e.column), max),
    0
  );

  for (const group of Object.keys(data)) {
    const existing = new Set(data[group].map(e => e.column));
    filledData[group] = [...data[group]];

    for (let i = 0; i <= maxColumn; i++) {
      if (!existing.has(i)) {
        filledData[group].push({ column: i, totalMeasure: 0 });
      }
    }

    filledData[group].sort((a, b) => a.column - b.column);
  }

  return filledData;
}

// ==============================
// Main builder
// ==============================

export async function buildChartData(
  periodWorkouts: {
    fecha: Date;
    exercises: WorkoutExercise[];
  }[]
): Promise<ChartData> {
  // Agrupación intermedia
  const progressByGroup: Record<
    string,
    Record<
      string,
      { totalReps: number; totalWeight: number; totalSets: number; totalExTime: number }
    >
  > = {};

  for (const w of periodWorkouts) {
    // ⚠️ evita problemas de timezone
    const dayKey = formatDateKey(w.fecha);

    for (const ex of w.exercises) {
      const group = await classifyExercise(ex.nombre);

      if (!progressByGroup[group]) {
        progressByGroup[group] = {};
      }

      if (!progressByGroup[group][dayKey]) {
        progressByGroup[group][dayKey] = {
          totalReps: 0,
          totalWeight: 0,
          totalSets: 0,
          totalExTime: 0,
        };
      }

      const reps = ex.repeticiones ?? 0;
      const weight = ex.peso ?? 0;
      const exTime = ex.duracionSegundos ?? 0;
      const series = ex.series ?? 1;

      progressByGroup[group][dayKey].totalReps += reps * series;
      progressByGroup[group][dayKey].totalWeight += weight * reps * series;
      progressByGroup[group][dayKey].totalSets += series;
      progressByGroup[group][dayKey].totalExTime += exTime * series;
    }
  }

  // Transformación final
  // Transformación final → sesiones consecutivas por músculo
const chartData: ChartData = {};

for (const [group, days] of Object.entries(progressByGroup)) {
  
  // 1) ordenar por fecha (solo para saber el orden de entrenamientos)
  const sortedDays = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b));

  // 2) convertir a columnas consecutivas (0,1,2,3...)
  let columnIndex = 0;

  chartData[group] = sortedDays.map(([_, values]) => {
    const totalReps = values.totalReps;
    const totalWeight = values.totalWeight;
    const totalExTime = values.totalExTime;
    const avgWeight = totalReps > 0 ? totalWeight / totalReps : 0;
    
    const point: TrainingProgress = {
      column: columnIndex++,
      totalMeasure: totalWeight > 0 ? totalWeight : totalExTime>0 ? totalExTime : totalReps
    };  

    return point;
  });
}

  return fillColumns(chartData);
}