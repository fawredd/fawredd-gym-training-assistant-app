# AGENTS BACKLOG

| ID | Title | Status | Assignee | Priority | Dependencies |
|---|---|---|---|---|---|
| AUTH-001 | Setup Next.js, Clerk Auth, Layout & DB | DONE | Technical BA | HIGH | None |
| WORK-001 | Workout CRUD & Data Schema | DONE | Technical BA | HIGH | AUTH-001 |
| DASH-001 | Dashboard Views | DONE | Technical BA | MEDIUM | WORK-001 |
| AI-001 | AI Recommendations engine | DONE | Technical BA | MEDIUM | WORK-001 |
| TRG-001 | Triage: VercelPostgres missing_connection_string | DONE | Infra Engineer | HIGH | None |
| WORK-002 | AI NLP to DB Workout Loader (ETL) | DONE | Technical BA | HIGH | AI-001 |
| DASH-002 | Phase 2 Dashboard Redesign (Mobile-First) | IN_REVIEW | QA Engineer | HIGH | DASH-001 |

## PM Logs
[PM]: Initializing backlog based on MVP scope from stakeholder inputs.
[PM]: DASH-002 implementation completed. Production build passed.
[QA]: DASH-002 code review found 3 critical/high gaps — edit route, new-from-base route, and delete UI all missing. Escalated to PM.

## Triage Queue (from QA)
| ID | Title | Status | Assignee | Priority | Dependencies |
|---|---|---|---|---|---|
| DASH-002-F1 | Triage: Create `/entrenamientos/[id]/edit` page | TODO | PM | HIGH | DASH-002 |
| DASH-002-F2 | Triage: Create `/entrenamientos/new` page with `baseId` query support | TODO | PM | HIGH | DASH-002 |
| DASH-002-F3 | Triage: Add delete workout/exercise button to frontend | TODO | PM | HIGH | DASH-002 |
| DASH-002-F4 | Fix hardcoded colors in `entrenamientos/page.tsx` for dark mode | TODO | Frontend Engineer | MEDIUM | DASH-002 |
| DASH-002-F5 | Cleanup: delete orphaned `AiSuggestion.tsx` | TODO | Frontend Engineer | LOW | DASH-002 |
| DASH-002-F6 | Refactor: extract `classifyExercise` to `lib/` | TODO | Frontend Engineer | LOW | DASH-002 |