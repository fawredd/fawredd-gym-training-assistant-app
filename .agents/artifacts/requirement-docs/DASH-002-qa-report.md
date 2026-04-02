# QA REPORT – DASH-002: Phase 2 Dashboard Redesign

**QA Agent** | Date: 2026-04-01 | Status: **FAIL — BLOCKED**

---

## Methodology

Code-level review of all dashboard components and related pages against every section of `agents-phase-2-requirements.md`. No running of the app — purely static analysis.

---

## Checklist vs. Requirements

### 1. HEADER
| Requirement | Status |
|------------|--------|
| Botón de menú (izquierda) | ✅ PASS — `Header.tsx` L14–24 |
| Título de la app (centro) | ✅ PASS — `Header.tsx` L27 |
| Toggle dark/light (derecha) | ✅ PASS — `ThemeToggle.tsx` |

---

### 2. CTA PRINCIPAL (CRÍTICO)
| Requirement | Status |
|------------|--------|
| Texto: "Registrar entrenamiento" | ✅ PASS — `MainCta.tsx` L11 |
| Visible sin scroll (above the fold) | ✅ PASS — rendered right after header |
| Redirigir al flujo de creación | ⚠️ PARTIAL — links to `/entrenamientos` (listing page) which also has forms, but does NOT link to a dedicated creation flow |

---

### 3. ESTADO DEL DÍA (CRÍTICO)
| Requirement | Status |
|------------|--------|
| Si entrenó hoy o no | ✅ PASS |
| Mensaje de acción si no entrenó | ✅ PASS |
| Recomendación breve (1 línea) de última ayuda memoria | ✅ PASS |

---

### 4. CALENDARIO DE ENTRENAMIENTOS
| Requirement | Status |
|------------|--------|
| Mostrar últimos 20 días incluyendo hoy | ✅ PASS |
| Resaltar día actual | ✅ PASS |
| Resaltar días con entrenamientos | ✅ PASS |
| Cada día clickeable | ⚠️ PARTIAL — days WITHOUT workouts are clickeable (buttons) but `onClick` does nothing (only fires `setSelectedWorkout(workout)` when `workout` is truthy). The requirement says "cada día debe ser clickeable" — days without workouts should at minimum indicate no data exists. |
| Modal: Visualizar ejercicios | ✅ PASS |
| Modal: EDITAR entrenamiento | ❌ **FAIL** — Links to `/entrenamientos/{id}/edit` but **this route does not exist**. Only `/entrenamientos/page.tsx` exists. |
| Modal: Botón "Usar como base" | ❌ **FAIL** — Links to `/entrenamientos/new?baseId={id}` but **this route does not exist**. No `/entrenamientos/new` page. No query param handling. |

---

### 5. RESUMEN SEMANAL (ÚLTIMOS 7 DÍAS)
| Requirement | Status |
|------------|--------|
| Tabla: Grupo muscular / Días trabajados | ✅ PASS |
| Ordenado de mayor a menor | ✅ PASS — `page.tsx` L162 sorts desc |
| Insight: Grupo más trabajado | ✅ PASS |
| Insight: Grupo menos trabajado | ✅ PASS |
| Insight: Frecuencia total (ej 3/7 días) | ✅ PASS |

---

### 6. BLOQUE DE AI (AYUDA MEMORIA)
| Requirement | Status |
|------------|--------|
| Última ayuda memoria generada | ✅ PASS |
| Claramente legible (no colapsada) | ✅ PASS |
| Separación visual del resto | ✅ PASS — uses distinct `bg-primary/5` + border |
| No regenerar AI | ✅ PASS — only reads from DB |

---

### 7. ARCHITECTURE / CODE QUALITY
| Item | Status |
|------|--------|
| Old `AiSuggestion.tsx` orphaned | ⚠️ — `app/dashboard/AiSuggestion.tsx` is no longer imported but still exists in the codebase. Should be deleted. |
| `entrenamientos/page.tsx` uses hardcoded colors | ⚠️ — Still uses `bg-white`, `text-blue-600`, `text-indigo-700`, etc. instead of theme tokens. Will break in dark mode. |
| Lógica de negocio en page.tsx | ⚠️ — `MUSCLE_MAP` and `classifyExercise()` live directly in the dashboard page. Spec says "No mezclar lógica de negocio en componentes UI". Should be extracted to `lib/`. |

---

## Exercise / Workout DELETE from Frontend

| Layer | DELETE support |
|-------|---------------|
| **API** (`/api/workouts/[id]`) | ✅ Exists — `DELETE` handler at L7–32 |
| **Frontend — Dashboard** | ❌ **No delete button** anywhere in dashboard components |
| **Frontend — Entrenamientos** | ❌ **No delete button** in `entrenamientos/page.tsx` or `WorkoutForm.tsx` |

**Conclusion: The user CANNOT delete a workout or exercise from the frontend.** The API endpoint exists but no UI element invokes it.

---

## Critical Failures Summary

| ID | Severity | Finding |
|----|----------|---------|
| F1 | **CRITICAL** | Edit route `/entrenamientos/{id}/edit` does not exist — calendar modal "Editar" link is broken |
| F2 | **CRITICAL** | Route `/entrenamientos/new?baseId=` does not exist — "Usar como base" link is broken |
| F3 | **HIGH** | No delete button for workouts/exercises in any frontend page |
| F4 | **MEDIUM** | `entrenamientos/page.tsx` hardcoded colors break dark mode |
| F5 | **LOW** | Orphaned `AiSuggestion.tsx` not cleaned up |
| F6 | **LOW** | Business logic (`classifyExercise`) in page component, should be in `lib/` |

---

## Escalation

```
[BLOCKED]
Agent: QA Engineer
Task: DASH-002 — Phase 2 Dashboard Redesign
Reason: Calendar modal links to non-existent edit/new routes (F1, F2). No frontend delete capability (F3). These are core user flows required by stakeholder requirements ("Editar entrenamientos existentes fácilmente").
Escalated To: Lead PM
```

```
[ESCALATION_REPORT]
Originating Agent: QA Engineer
Target Domain: Frontend / PM
Error Log: F1-F3 are implementation gaps vs stakeholder-required behavior. F4 breaks dark mode UX.
Impact on Current Task: Blocked — DASH-002 cannot be marked DONE until F1-F3 are resolved.
```
