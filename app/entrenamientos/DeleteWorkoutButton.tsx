"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("¿Seguro que querés eliminar este entrenamiento?")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Error al eliminar.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Eliminar entrenamiento"
            className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
        >
            {isDeleting ? "…" : "🗑️"}
        </button>
    );
}
