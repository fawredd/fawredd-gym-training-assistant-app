// ==============================
// Types
// ==============================

import { classifyExercise } from "./muscleClassifier";

type MuscleProgress = {
  date: string;        // "YYYY-MM-DD"
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


// Rellena días faltantes para gráficos continuos
function fillMissingDays(data: MuscleProgress[]): MuscleProgress[] {
  if (data.length === 0) return data;

  const result: MuscleProgress[] = [];

  const start = new Date(data[0].date + "T00:00:00");
  const end = new Date(data[data.length - 1].date + "T00:00:00");

  const current = new Date(start);

  while (current <= end) {
    const key = formatDateKey(current);

    const existing = data.find((d) => d.date === key);

    result.push(
      existing ?? {
        date: key,
        totalReps: 0,
        totalWeight: 0,
        avgWeight: 0,
      }
    );

    current.setDate(current.getDate() + 1);
  }

  return result;
}


// ==============================
// Main builder
// ==============================

export function buildChartData(
  weeklyWorkouts: {
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

  for (const w of weeklyWorkouts) {
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
  const chartData: ChartData = {};

  for (const [group, days] of Object.entries(progressByGroup)) {
    const sorted = Object.entries(days)
      .map(([date, values]) => ({
        date,
        totalReps: values.totalReps,
        totalWeight: values.totalWeight,
        avgWeight:
          values.totalReps > 0
            ? values.totalWeight / values.totalReps
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 🔥 clave para UX
    chartData[group] = fillMissingDays(sorted);
  }

  return chartData;
}