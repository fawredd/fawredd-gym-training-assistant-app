// ==============================
// Types
// ==============================

import { classifyExercise } from "./muscleClassifier";

type MuscleProgress = {
  column: number;        // "YYYY-MM-DD"
  totalReps: number;
  totalWeight: number; // volumen total
  avgWeight: number;   // peso promedio por rep
};

export type ChartData = Record<string, MuscleProgress[]>;

// ==============================
// Helpers
// ==============================

// Asegurate que esto devuelva "YYYY-MM-DD"
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}
// ==============================
// Main builder
// ==============================

export function buildChartData(
  periodWorkouts: {
    fecha: Date;
    exercises: {
      nombre: string;
      repeticiones: number | null;
      peso: number | null;
      series: number | null;
    }[];
  }[]
): ChartData {
  // Agrupación intermedia
  const progressByGroup: Record<
    string,
    Record<
      string,
      { totalReps: number; totalWeight: number; totalSets: number }
    >
  > = {};

  for (const w of periodWorkouts) {
    // ⚠️ evita problemas de timezone
    const dayKey = formatDateKey(w.fecha);

    for (const ex of w.exercises) {
      const group = classifyExercise(ex.nombre);

      if (!progressByGroup[group]) {
        progressByGroup[group] = {};
      }

      if (!progressByGroup[group][dayKey]) {
        progressByGroup[group][dayKey] = {
          totalReps: 0,
          totalWeight: 0,
          totalSets: 0,
        };
      }

      const reps = ex.repeticiones ?? 0;
      const weight = ex.peso ?? 0;
      const series = ex.series ?? 1;

      progressByGroup[group][dayKey].totalReps += reps * series;
      progressByGroup[group][dayKey].totalWeight += weight * reps * series;
      progressByGroup[group][dayKey].totalSets += series;
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
    const avgWeight = totalReps > 0 ? totalWeight / totalReps : 0;

    const point: MuscleProgress = {
      column: columnIndex++,
      totalReps,
      totalWeight,
      avgWeight,
    };

    return point;
  });
}

  return chartData;
}