// ==============================
// Types
// ==============================


export type MuscleGroup =
  | "Pecho"
  | "Espalda Alta"
  | "Espalda Baja"
  | "Hombros"
  | "Bíceps"
  | "Tríceps"
  | "Cuádriceps"
  | "Isquiotibiales"
  | "Glúteos"
  | "Gemelos"
  | "Abdominales"
  | "Core"
  | `Otros - ${string}`;


const SPECIFIC_RULES: { keywords: string[]; group: MuscleGroup }[] = [
  // --- PRESS (evita errores críticos) ---
  { keywords: ["press", "hombro"], group: "Hombros" },
  { keywords: ["press", "militar"], group: "Hombros" },
  { keywords: ["press", "inclinado"], group: "Pecho" },
  { keywords: ["press", "declinado"], group: "Pecho" },
  { keywords: ["press", "pecho"], group: "Pecho" },

  // --- CALISTENIA ---
  { keywords: ["flexiones"], group: "Pecho" },
  { keywords: ["flexion"], group: "Pecho" },
  { keywords: ["push", "up"], group: "Pecho" },

  { keywords: ["dominadas"], group: "Espalda Alta" },
  { keywords: ["pull", "up"], group: "Espalda Alta" },
  { keywords: ["chin", "up"], group: "Espalda Alta" },

  { keywords: ["fondos", "paralelas"], group: "Pecho" },
  { keywords: ["fondos", "banco"], group: "Tríceps" },

  // --- CORE FUNCIONAL ---
  { keywords: ["dead", "bug"], group: "Core" },
  { keywords: ["bird", "dog"], group: "Core" },
  { keywords: ["hollow"], group: "Core" },

  // --- GLÚTEOS / CADENA POSTERIOR ---
  { keywords: ["hip", "thrust"], group: "Glúteos" },
  { keywords: ["peso", "muerto"], group: "Espalda Baja" },
  { keywords: ["deadlift"], group: "Espalda Baja" },

  // --- PIERNAS ---
  { keywords: ["curl", "femoral"], group: "Isquiotibiales" },
  { keywords: ["extension", "cuadriceps"], group: "Cuádriceps" },
  { keywords: ["zancadas"], group: "Glúteos" },
  { keywords: ["lunges"], group: "Glúteos" },

  // --- BRAZOS ---
  { keywords: ["curl", "martillo"], group: "Bíceps" },
  { keywords: ["hammer", "curl"], group: "Bíceps" },
];


const SIMPLE_KEYWORDS: [string, MuscleGroup][] = [
  // --- Pecho ---
  ["pecho", "Pecho"],
  ["press", "Pecho"],
  ["aperturas", "Pecho"],
  ["fly", "Pecho"],
  ["flexiones", "Pecho"],

  // --- Espalda ---
  ["remo", "Espalda Alta"],
  ["jalon", "Espalda Alta"],
  ["jalón", "Espalda Alta"],
  ["dominadas", "Espalda Alta"],
  ["pull", "Espalda Alta"],
  ["espalda", "Espalda Alta"],
  ["lumbar", "Espalda Baja"],

  // --- Hombros ---
  ["hombro", "Hombros"],
  ["deltoides", "Hombros"],
  ["lateral", "Hombros"],
  ["frontal", "Hombros"],
  ["elevaciones", "Hombros"],

  // --- Bíceps ---
  ["bicep", "Bíceps"],
  ["bícep", "Bíceps"],
  ["curl", "Bíceps"],

  // --- Tríceps ---
  ["tricep", "Tríceps"],
  ["trícep", "Tríceps"],
  ["extension", "Tríceps"],
  ["extensión", "Tríceps"],
  ["patada", "Tríceps"],

  // --- Cuádriceps ---
  ["sentadilla", "Cuádriceps"],
  ["squat", "Cuádriceps"],
  ["prensa", "Cuádriceps"],
  ["cuadricep", "Cuádriceps"],
  ["cuádricep", "Cuádriceps"],

  // --- Isquios ---
  ["femoral", "Isquiotibiales"],

  // --- Glúteos ---
  ["gluteo", "Glúteos"],
  ["gluteos", "Glúteos"],
  ["puente", "Glúteos"],
  ["hip", "Glúteos"],

  // --- Gemelos ---
  ["gemelo", "Gemelos"],
  ["pantorrilla", "Gemelos"],
  ["calf", "Gemelos"],

  // --- Core ---
  ["abdomen", "Abdominales"],
  ["abdominal", "Abdominales"],
  ["crunch", "Abdominales"],
  ["plancha", "Core"],
  ["plank", "Core"],
  ["core", "Core"],
  ["rotacion", "Core"],
  ["russian", "Core"],

  // --- Funcional / general ---
  ["burpee", "Core"],
  ["mountain", "Core"],

  // --- fallback final ---
];


// ==============================
// Normalización
// ==============================

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca tildes
}


// ==============================
// Clasificador principal
// ==============================

export function classifyExercise(nombre: string): MuscleGroup {
  const lower = normalize(nombre);

  // 1️⃣ reglas específicas (más importantes)
  for (const rule of SPECIFIC_RULES) {
    if (rule.keywords.every((k) => lower.includes(k))) {
      return rule.group;
    }
  }

  // 2️⃣ fallback simple
  for (const [keyword, group] of SIMPLE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return group;
    }
  }

  return `Otros - ${lower}`;
}