# AGENTS BACKLOG

| ID       | Title                                            | Status  | Assignee       | Priority | Dependencies |
| -------- | ------------------------------------------------ | ------- | -------------- | -------- | ------------ |
| AUTH-001 | Setup Next.js, Clerk Auth, Layout & DB           | DONE    | Technical BA   | HIGH     | None         |
| WORK-001 | Workout CRUD & Data Schema                       | DONE    | Technical BA   | HIGH     | AUTH-001     |
| DASH-001 | Dashboard Views                                  | DONE    | Technical BA   | MEDIUM   | WORK-001     |
| AI-001   | AI Recommendations engine                        | DONE    | Technical BA   | MEDIUM   | WORK-001     |
| TRG-001  | Triage: VercelPostgres missing_connection_string | DONE    | Infra Engineer | HIGH     | None         |
| WORK-002 | AI NLP to DB Workout Loader (ETL)                | DONE    | Technical BA   | HIGH     | AI-001       |
| DASH-002 | Phase 2 Dashboard Redesign (Mobile-First)        | BLOCKED | QA Engineer    | HIGH     | DASH-001     |
| PWA-001  | Progressive Web App (PWA) Implementation        | DONE    | Frontend Agent | HIGH     | DASH-001     |

## PM Logs

[PM]: Initializing backlog based on MVP scope from stakeholder inputs.
[PM]: DASH-002 implementation completed. Production build passed.
[QA]: DASH-002 code review found 3 critical/high gaps — edit route, new-from-base route, and delete UI all missing. Escalated to PM.
[PM]: Phase 3 requirements created and submitted: agents-phase-3-requirements.md
[PM]: Consolidated audit created: [.agents/artifacts/AUDIT-PHASES-1-3.md](.agents/artifacts/AUDIT-PHASES-1-3.md)

## Phase 3 — Agent Tasks (create one chat per task)

Below are the recommended Phase 3 tasks. Per Workspace Governance, open a separate agent chat named as shown in `ChatName` when assigning work.

| ID      | Title                                                   | Status | Assignee                | Priority | Dependencies | ChatName                                         |
| ------- | ------------------------------------------------------- | ------ | ----------------------- | -------- | ------------ | ------------------------------------------------ |
| PH3-BE  | Backend: DB migrations, dashboard aggregation endpoints | TODO   | Backend Engineer        | HIGH     | BE-001       | [TASK-PH3-BE] Backend: Migrations & Aggregations |
| PH3-FE  | Frontend: shadcn theme migration & accessibility polish | TODO   | Frontend Engineer       | HIGH     | THEME-001    | [TASK-PH3-FE] Frontend: Theme Migration & A11y   |
| PH3-INF | Infrastructure: CI, migrations check, Redis config      | TODO   | Infrastructure Engineer | HIGH     | INF-001      | [TASK-PH3-INF] Infra: CI & Redis Config          |
| PH3-QA  | QA: BDD integration, CI gating, test coverage           | TODO   | QA Engineer             | HIGH     | QA-001       | [TASK-PH3-QA] QA: BDD + CI Integration           |
| PH3-SEC | Security: full security audit and remediation plan      | TODO   | Security Engineer       | HIGH     | None         | [TASK-PH3-SEC] Security: Audit & Remediation     |

| AUDIT-001 | Consolidated: Phases 1-3 audit report | DONE | PM | HIGH | PH3-BE,PH3-INF | [TASK-AUDIT-001] Consolidated Audit |

### Guidance for PM when opening agent chats

- Provide the requirement doc link: [agents-phase-3-requirements.md](agents-phase-3-requirements.md)
- Link the corresponding backlog row above (ID) and include any relevant QA artifacts (feature files) or API contracts.
- For each chat, include acceptance criteria from `agents-phase-3-requirements.md` and the `agents-backlog.md` dependency chain.

[PM]: Created Phase 3 agent tasks. Start one chat per `ChatName` entry and assign to respective engineers.

## Triage Queue (from QA)

| ID           | Title                                                                 | Status  | Assignee          | Priority | Dependencies |
| ------------ | --------------------------------------------------------------------- | ------- | ----------------- | -------- | ------------ |
| DASH-002-F1  | Triage: Create `/entrenamientos/[id]/edit` page                       | DONE    | PM                | HIGH     | DASH-002     |
| DASH-002-F2  | Triage: Create `/entrenamientos/new` page with `baseId` query support | DONE    | PM                | HIGH     | DASH-002     |
| DASH-002-F3  | Triage: Add delete workout/exercise button to frontend                | DONE    | PM                | HIGH     | DASH-002     |
| DASH-002-F4  | Fix hardcoded colors in `entrenamientos/page.tsx` for dark mode       | TODO    | Frontend Engineer | MEDIUM   | DASH-002     |
| DASH-002-F5  | Cleanup: delete orphaned `AiSuggestion.tsx`                           | TODO    | Frontend Engineer | LOW      | DASH-002     |
| DASH-002-F6  | Refactor: extract `classifyExercise` to `lib/`                        | TODO    | Frontend Engineer | LOW      | DASH-002     |
| TRG-NEON-001 | Triage: DB ETIMEDOUT on users query (Neon pool)                       | BLOCKED | PM                | HIGH     | INF-001      |

## Audit Findings Backlog (auto-generated)

| ID        | Title                                                                                           | Status | Assignee                | Priority | Dependencies |
| --------- | ----------------------------------------------------------------------------------------------- | ------ | ----------------------- | -------- | ------------ |
| AUDIT-001 | Calendar: make empty days clickable and show 'Sin ejercicios' sheet                             | DONE   | Frontend Engineer       | HIGH     | DASH-002     |
| AUDIT-002 | Replace hardcoded color classes (`bg-white`, `text-indigo-700`) with theme tokens               | DONE   | Frontend Engineer       | HIGH     | DASH-002     |
| AUDIT-003 | Add BDD tests for calendar modal flows, edit/clone flows, and delete                            | TODO   | QA Engineer             | HIGH     | DASH-002     |
| AUDIT-004 | Accessibility pass for dashboard components (aria, focus states)                                | TODO   | Frontend Engineer       | MEDIUM   | DASH-002     |
| AUDIT-005 | Sync .agents artifacts: remove stale STATE claims, update STATE.md and requirement-docs linkage | TODO   | PM                      | HIGH     | AUDIT-001    |
| AUDIT-006 | Add CI gating for BDD tests and typecheck before deployment                                     | TODO   | Infrastructure Engineer | MEDIUM   | PH3-INF      |

[PM]: These `AUDIT-*` tasks were created automatically from the consolidated audit. Create a separate agent chat per Workspace Governance for each task when assigning.

## Sprint Tasks (Backlog)

| ID        | Title                                                                                       | Status | Assignee                | Priority | Dependencies |
| --------- | ------------------------------------------------------------------------------------------- | ------ | ----------------------- | -------- | ------------ |
| UI-001    | Apply global `ThemeProvider` and adjust Entrenamientos header (mobile)                      | DONE   | Frontend Engineer       | HIGH     | DASH-002     |
| BE-001    | Wrap PUT workout update in DB transaction                                                   | DONE   | Backend Engineer        | HIGH     | WORK-001     |
| BE-002    | Add dashboard aggregation endpoints (workouts/week, total volume)                           | TODO   | Backend Engineer        | HIGH     | DASH-002     |
| INF-001   | Add migration tooling and CI schema check (drizzle-kit)                                     | TODO   | Infrastructure Engineer | MEDIUM   | WORK-001     |
| PERF-001  | Audit and fix potential N+1 queries for workouts+exercises                                  | TODO   | Backend Engineer        | MEDIUM   | WORK-001     |
| QA-001    | Run typecheck and test suite; add missing BDD tests to CI                                   | TODO   | QA Engineer             | HIGH     | DASH-002     |
| THEME-001 | Prepare repository for `shadcn` theme integration and document next steps for user-run init | TODO   | Frontend Engineer       | MEDIUM   | DASH-002     |

[PM]: Sprint 1 changes applied: global ThemeProvider, Entrenamientos header tweak, theme variables made overrideable, PUT workout update wrapped in transaction.
