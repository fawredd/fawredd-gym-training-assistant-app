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
  value: string | null;
  onValueChange: (value: string | null) => void;
}
export function ExercisesCombobox({ id, value, onValueChange }: ExercisesComboboxProps) {
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
    >
      <ComboboxInput placeholder="Select an exercise" />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: ExerciseCatalogRow) => (
            <ComboboxItem key={item.id} value={item.id}>
              {`${item.nombreNormalizado} | (${item.grupoMuscular} | ${item.actividad})`}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
