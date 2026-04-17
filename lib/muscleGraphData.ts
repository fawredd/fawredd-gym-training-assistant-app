import { classifyExercise } from "./muscleClassifier";
import type { WorkoutExercise } from "@/db/schema";

export type TrainingProgress = {
  column: number;
  totalMeasure: number;
  description: string;
};

export type ChartData = Record<string, TrainingProgress[]>;

// ==============================
// Helpers
// ==============================

function fillColumns(data: ChartData): ChartData {
  const filledData: ChartData = {};

  const maxColumn = Object.values(data).reduce(
    (max, exercise) => Math.max(...exercise.map((e) => e.column), max),
    0,
  );

  for (const group of Object.keys(data)) {
    const existing = new Set(data[group].map((e) => e.column));
    filledData[group] = [...data[group]];

    for (let i = 0; i <= maxColumn; i++) {
      if (!existing.has(i)) {
        filledData[group].push({ column: i, totalMeasure: 0, description:'' });
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
    fecha: string;
    exercises: WorkoutExercise[];
  }[],
): Promise<ChartData> {
  // Agrupación intermedia
  const progressByGroup: Record<
    string,
    Record<
      string,
      {
        totalReps: number;
        totalWeight: number;
        totalSets: number;
        totalExTime: number;
        exerciseResume: string;
      }
    >
  > = {};

  for (const w of periodWorkouts) {
    const dayKey = w.fecha;
    for (const ex of w.exercises) {
      const group = ex.grupoMuscular;

      if (!progressByGroup[group]) {
        progressByGroup[group] = {};
      }

      if (!progressByGroup[group][dayKey]) {
        progressByGroup[group][dayKey] = {
          totalReps: 0,
          totalWeight: 0,
          totalSets: 0,
          totalExTime: 0,
          exerciseResume: "",
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
      progressByGroup[group][dayKey].exerciseResume = progressByGroup[group][dayKey].exerciseResume + `\n` + 
        `-${ex.nombre}:S${ex.series}${ex.repeticiones ? "xR" + ex.repeticiones : ""}${ex.peso ? "x" + ex.peso + "kg" : ""}${ex.duracionSegundos ? "x" + ex.duracionSegundos + "seg" : ""} `;
    }
  }
  //console.log("BuildChartData: progressByGroup", progressByGroup)
  // Transformación final
  // Transformación final → sesiones consecutivas por músculo
  const chartData: ChartData = {};

  for (const [group, days] of Object.entries(progressByGroup)) {
    // 1) ordenar por fecha (solo para saber el orden de entrenamientos)
    const sortedDays = Object.entries(days).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    // 2) convertir a columnas consecutivas (0,1,2,3...)
    let columnIndex = 0;

    chartData[group] = sortedDays.map(([_, values]) => {
      const totalReps = values.totalReps;
      const totalWeight = values.totalWeight;
      const totalExTime = values.totalExTime;

      const point: TrainingProgress = {
        column: columnIndex++,
        totalMeasure:
          totalWeight > 0
            ? totalWeight
            : totalExTime > 0
              ? totalExTime
              : totalReps,
        description: values.exerciseResume.trim()
      };

      return point;
    });
  }

  return fillColumns(chartData);
}
