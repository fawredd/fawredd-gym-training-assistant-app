// Muscle group classification utility
// Extracted from dashboard page for reuse and separation of concerns

const MUSCLE_MAP: Record<string, string> = {
    pecho: "Pecho",
    press: "Pecho",
    fondos: "Pecho",
    espalda: "Espalda",
    remo: "Espalda",
    jalón: "Espalda",
    jalon: "Espalda",
    dominadas: "Espalda",
    hombro: "Hombros",
    lateral: "Hombros",
    deltoides: "Hombros",
    bícep: "Bíceps",
    bicep: "Bíceps",
    curl: "Bíceps",
    trícep: "Tríceps",
    tricep: "Tríceps",
    extensión: "Tríceps",
    extension: "Tríceps",
    pierna: "Piernas",
    sentadilla: "Piernas",
    squat: "Piernas",
    femoral: "Piernas",
    cuádricep: "Piernas",
    cuadricep: "Piernas",
    gemelo: "Piernas",
    lunges: "Piernas",
    peso: "Espalda",
    deadlift: "Espalda",
    core: "Core",
    abdomen: "Core",
    plancha: "Core",
    crunch: "Core",
};

export function classifyExercise(nombre: string): string {
    const lower = nombre.toLowerCase();
    for (const [keyword, group] of Object.entries(MUSCLE_MAP)) {
        if (lower.includes(keyword)) return group;
    }
    return "Otros";
}
