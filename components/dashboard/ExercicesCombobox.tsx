"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { ExerciseCatalogRow } from "@/db/schema";
import { fetchExerciseCatalog } from "@/lib/workouts-utils";
import { useState, useEffect } from "react";

interface ExercisesComboboxProps {
  id: string;
  required?: boolean;
  value: string | null;
  onValueChange: (value: string | null) => void;
}
export function ExercisesCombobox({ id, required, value, onValueChange }: ExercisesComboboxProps) {
  const [exercises, setExercises] = useState<ExerciseCatalogRow[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    async function loadExercises() {
      const data = await fetchExerciseCatalog();
      if (!cancelled) {
        setExercises(data);
      }
    }
    loadExercises();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Combobox
      id={id}
      items={exercises}
      value={value}
      onValueChange={onValueChange}
      autoHighlight
      name="exerciseCombobox"
      required={required}
      limit={10}
    >
      <ComboboxInput placeholder="Select an exercise" />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList className={`text-stone-300`}>
          {(exercise: ExerciseCatalogRow) => (
            <ComboboxItem key={exercise.id} value={exercise.nombreNormalizado}>
              {`${exercise.nombreNormalizado} | (${exercise.grupoMuscular} | ${exercise.actividad})`}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
