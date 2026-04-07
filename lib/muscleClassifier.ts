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
  | "Aductores"     // ← nuevo
  | "Abductores"    // ← nuevo
  | "Glúteos"
  | "Gemelos"
  | "Abdominales"
  | "Core"
  | `Otros - ${string}`;

// ==============================
// Normalización
// ==============================

// Centralizada y exportable para poder normalizar también los keywords
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ==============================
// Reglas específicas (multi-keyword, mayor prioridad)
// Todos los keywords ya normalizados (sin tildes, minúsculas)
// ==============================

const SPECIFIC_RULES: { keywords: string[]; group: MuscleGroup }[] = [
  // --- PRESS ---
  { keywords: ["press", "hombro"],    group: "Hombros" },
  { keywords: ["press", "militar"],   group: "Hombros" },
  { keywords: ["press", "inclinado"], group: "Pecho" },
  { keywords: ["press", "declinado"], group: "Pecho" },
  { keywords: ["press", "pecho"],     group: "Pecho" },

  // --- EXTENSION (ambigua sin contexto: cuádriceps vs tríceps) ---
  { keywords: ["extension", "cuadricep"], group: "Cuádriceps" },
  { keywords: ["extension", "pierna"],    group: "Cuádriceps" },
  { keywords: ["extension", "rodilla"],   group: "Cuádriceps" },
  { keywords: ["extension", "tricep"],    group: "Tríceps" },
  { keywords: ["extension", "polea"],     group: "Tríceps" },
  { keywords: ["extension", "cuerda"],    group: "Tríceps" },
  { keywords: ["extension", "bajos"],     group: "Tríceps" }, // polea bajos

  // --- CURL (ambiguo: bíceps vs isquios) ---
  { keywords: ["curl", "femoral"],    group: "Isquiotibiales" },
  { keywords: ["curl", "isquio"],     group: "Isquiotibiales" },
  { keywords: ["curl", "pierna"],     group: "Isquiotibiales" },
  { keywords: ["curl", "martillo"],   group: "Bíceps" },
  { keywords: ["hammer", "curl"],     group: "Bíceps" },

  // --- CALISTENIA ---
  { keywords: ["push", "up"],           group: "Pecho" },
  { keywords: ["pull", "up"],           group: "Espalda Alta" },
  { keywords: ["chin", "up"],           group: "Espalda Alta" },
  { keywords: ["fondos", "paralelas"],  group: "Pecho" },
  { keywords: ["fondos", "banco"],      group: "Tríceps" },

  // --- CORE FUNCIONAL ---
  { keywords: ["dead", "bug"],  group: "Core" },
  { keywords: ["bird", "dog"],  group: "Core" },
  { keywords: ["hollow"],       group: "Core" },

  // --- CADENA POSTERIOR ---
  { keywords: ["hip", "thrust"],  group: "Glúteos" },
  { keywords: ["peso", "muerto"], group: "Espalda Baja" },
  { keywords: ["deadlift"],       group: "Espalda Baja" },
  { keywords: ["romanian"],       group: "Isquiotibiales" }, // RDL → isquios

  // --- PIERNAS / MÁQUINAS ---
  { keywords: ["zancadas"],  group: "Glúteos" },
  { keywords: ["lunges"],    group: "Glúteos" },
];

// ==============================
// Keywords simples (unambiguous, orden importa)
// Todos normalizados — sin tildes, minúsculas
// ==============================

const SIMPLE_KEYWORDS: [string, MuscleGroup][] = [
  // --- Pecho ---
  ["pecho",     "Pecho"],
  ["press",     "Pecho"],   // fallback: sin calificador → pecho es más común
  ["aperturas", "Pecho"],
  ["fly",       "Pecho"],
  ["flexion",   "Pecho"],

  // --- Espalda Alta ---
  ["remo",      "Espalda Alta"],
  ["jalon",     "Espalda Alta"],
  ["dominadas", "Espalda Alta"],
  ["pull",      "Espalda Alta"],
  ["espalda",   "Espalda Alta"],

  // --- Espalda Baja ---
  ["lumbar",    "Espalda Baja"],

  // --- Hombros ---
  ["hombro",      "Hombros"],
  ["deltoides",   "Hombros"],
  ["elevaciones", "Hombros"],

  // --- Bíceps ---
  ["bicep", "Bíceps"],
  ["curl",  "Bíceps"],   // fallback: sin calificador → bíceps es más común

  // --- Tríceps ---
  ["tricep", "Tríceps"],
  ["patada", "Tríceps"],
  // "extension" eliminada — demasiado ambigua, se maneja en SPECIFIC_RULES

  // --- Cuádriceps ---
  ["sentadilla", "Cuádriceps"],
  ["squat",      "Cuádriceps"],
  ["prensa",     "Cuádriceps"],
  ["cuadricep",  "Cuádriceps"],

  // --- Isquiotibiales ---
  ["isquiotibial", "Isquiotibiales"],  // ← "maquina isquiotibiales sentado" ✓
  ["femoral",      "Isquiotibiales"],

  // --- Aductores ---
  ["aduccion", "Aductores"],  // ← "maquina aduccion sentado" ✓
  ["aductor",  "Aductores"],

  // --- Abductores ---
  ["abduccion", "Abductores"],  // ← "maquina abduccion sentado" ✓
  ["abductor",  "Abductores"],

  // --- Glúteos ---
  ["gluteo", "Glúteos"],
  ["puente", "Glúteos"],
  ["hip",    "Glúteos"],

  // --- Gemelos ---
  ["gemelo",      "Gemelos"],
  ["pantorrilla", "Gemelos"],
  ["calf",        "Gemelos"],

  // --- Abdominales ---
  ["abdomen",   "Abdominales"],
  ["abdominal", "Abdominales"],
  ["crunch",    "Abdominales"],

  // --- Core ---
  ["plancha",  "Core"],
  ["plank",    "Core"],
  ["core",     "Core"],
  ["rotacion", "Core"],
  ["russian",  "Core"],
  ["burpee",   "Core"],
  ["mountain", "Core"],
];

// ==============================
// Clasificador principal
// ==============================

export function classifyExercise(nombre: string): MuscleGroup {
  const lower = normalize(nombre);

  // 1️⃣ Reglas compuestas (mayor prioridad)
  for (const rule of SPECIFIC_RULES) {
    // FIX: normalizar cada keyword antes de comparar
    if (rule.keywords.every((k) => lower.includes(normalize(k)))) {
      return rule.group;
    }
  }

  // 2️⃣ Fallback: keyword simple
  for (const [keyword, group] of SIMPLE_KEYWORDS) {
    // FIX: normalizar el keyword antes de comparar
    if (lower.includes(normalize(keyword))) {
      return group;
    }
  }

  return `Otros - ${lower}`;
}