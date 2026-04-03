"use client";

import { useState } from "react";
import Link from "next/link";

interface Exercise {
  id: string;
  nombre: string;
  series: number | null;
  repeticiones: number | null;
  peso: number | null;
  duracionSegundos: number | null;
}

interface WorkoutDay {
  id: string;
  fecha: string; // ISO string
  exercises: Exercise[];
}

interface TrainingCalendarProps {
  workoutsByDate: Record<string, WorkoutDay>; // key: "YYYY-MM-DD"
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function TrainingCalendar({ workoutsByDate }: TrainingCalendarProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(
    null,
  );
  const [emptyDay, setEmptyDay] = useState<string | null>(null);

  // Build last 20 days including today
  const days: Date[] = [];
  for (let i = 19; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const todayStr = formatDate(new Date());

  return (
    <div className="mx-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        📅 Últimos 20 días
      </h2>

      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => {
          const key = formatDate(day);
          const workout = workoutsByDate[key];
          const isToday = key === todayStr;

          return (
            <button
              key={key}
              onClick={() => {
                if (workout) {
                  setSelectedWorkout(workout);
                } else {
                  setEmptyDay(key);
                }
              }}
              className={[
                "flex flex-col items-center justify-center rounded-xl py-2.5 px-1 transition-all",
                workout
                  ? "bg-primary text-primary-foreground shadow-sm active:scale-95"
                  : "bg-muted text-muted-foreground",
                isToday && !workout ? "ring-2 ring-primary ring-offset-1" : "",
                isToday && workout ? "ring-2 ring-white ring-offset-1" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-[10px] font-medium">
                {DAY_LABELS[day.getDay()]}
              </span>
              <span className="text-sm font-bold">{day.getDate()}</span>
              {workout && <span className="text-[10px] mt-0.5">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedWorkout(null)}
          />
          {/* Sheet */}
          <div className="relative z-10 w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {new Date(selectedWorkout.fecha).toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <button
                onClick={() => setSelectedWorkout(null)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Exercise list */}
            {selectedWorkout.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin ejercicios registrados.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {selectedWorkout.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="py-2.5 flex justify-between items-start gap-2"
                  >
                    <span className="font-medium text-sm leading-tight">
                      {ex.nombre}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {ex.duracionSegundos && ex.duracionSegundos > 0
                        ? `${ex.duracionSegundos}s`
                        : `${ex.series ?? 1}×${ex.repeticiones ?? 0}${ex.peso ? ` @ ${ex.peso}kg` : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/entrenamientos/${selectedWorkout.id}/edit`}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm active:scale-95 transition-transform"
                onClick={() => setSelectedWorkout(null)}
              >
                ✏️ Editar entrenamiento
              </Link>
              <Link
                href={`/entrenamientos/new?baseId=${selectedWorkout.id}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-semibold text-sm active:scale-95 transition-transform hover:bg-muted"
                onClick={() => setSelectedWorkout(null)}
              >
                📋 Usar como base
              </Link>
            </div>
          </div>
        </div>
      )}

      {emptyDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEmptyDay(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {new Date(emptyDay).toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <button
                onClick={() => setEmptyDay(null)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sin ejercicios registrados.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/entrenamientos/new?date=${emptyDay}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm active:scale-95 transition-transform"
                onClick={() => setEmptyDay(null)}
              >
                ➕ Nuevo Entrenamiento
              </Link>
              <button
                onClick={() => setEmptyDay(null)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-semibold text-sm active:scale-95 transition-transform hover:bg-muted"
              >
                ✖️ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
