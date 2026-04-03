**Audit: Phases 1–3 — Implementation vs Requirements**

Summary

- Scope: static audit across Phase 1 (DASH-001 / WORK-001), Phase 2 (DASH-002) and Phase 3 (agents-phase-3-requirements.md).
- Sources: requirement docs, codebase, CI infra files, QA artifacts.

1. Gap analysis (requirements → implementation)

- Dashboard blocks: implemented components exist but Objective block was missing initially; now server renders an Objective block [app/dashboard/page.tsx](app/dashboard/page.tsx).
- Workouts CRUD: endpoints present ([app/api/workouts/route.ts](app/api/workouts/route.ts), [app/api/workouts/[id]/route.ts](app/api/workouts/%5Bid%5D/route.ts)) but some transaction safety and migrations gaps remain.
- AI loop extension: AI endpoint updated to include objective/state but relies on new DB tables; check [app/api/ai/route.ts](app/api/ai/route.ts) and [db/schema.ts](db/schema.ts).
- Migrations: missing or incomplete migration files; refer to [scripts/init-schema.sql](scripts/init-schema.sql) and recommended drizzle migrations.

2. Missing features (highest impact)

- Reliable DB migrations for new tables: `training_objectives`, `training_states` (absent in migration scripts). See [db/schema.ts](db/schema.ts).
- Centralized rate-limiting applied consistently to all AI endpoints (only /api/ai had KV logic). See [app/api/ai/route.ts](app/api/ai/route.ts).
- CI/docker production build issues: `scripts/init-db.js` and `db/index.ts` rely on Vercel-specific clients (infra audit). See [scripts/init-db.js](scripts/init-db.js) and [db/index.ts](db/index.ts).

3. Incorrect / partial implementations

- Some endpoints assume DB tables exist but migrations/schemas are not applied in scripts (runtime crash risk): [app/api/objective/route.ts](app/api/objective/route.ts).
- Several multi-step DB operations lack robust transactions (workout creation POST, ETL flows). See [app/api/workouts/route.ts](app/api/workouts/route.ts) and [app/api/workouts/etl/route.ts](app/api/workouts/etl/route.ts).

4. Technical debt

- Vercel-specific libs (`@vercel/postgres`) baked into scripts and DB client: reduces portability / CI reliability.
- Hardcoded theme tokens in `app/globals.css` (partially mitigated) — must finalize after `shadcn` init.
- Missing migration tooling (drizzle-kit) and no CI schema drift checks.

5. Prioritized backlog (top actionables)

- P0: Add & run migrations for new tables; verify with drizzle-kit (owner: Backend). Files: add migration SQL under `/drizzle/migrations/`.
- P0: Fix DB provider parity: replace Vercel-only clients in `scripts/init-db.js` and `db/index.ts` or add adapter layer (owner: Infra/Backend).
- P0: Ensure transaction safety for POST/PUT/ETL endpoints (owner: Backend). See [app/api/workouts/\*](app/api/workouts).
- P0: Add consistent rate-limiting for AI endpoints and sanitize AI inputs (owner: Security/Backend).
- P1: Replace hardcoded colors with `shadcn` tokens and finalize theme after user runs preset (owner: Frontend).
- P1: Add BDD step definitions and integrate existing feature files into CI (owner: QA).
- P2: Add monitoring (error reporting) and DB backup/migration rollback playbook (owner: Infra/Security).

6. Execution roadmap (3 sprints, recommended)

- Sprint 1 (1 week): DB migrations + transaction fixes + AI rate-limit standardization + quick infra fixes for local build. Deliverables: migration files, patched endpoints, verified `pnpm run build` locally.
- Sprint 2 (1 week): Theme integration prep (shadcn), frontend accessibility fixes, add unit/integration tests for critical flows, seed test fixtures. Deliverables: theme-ready CSS, Objective UI validated, tests added.
- Sprint 3 (1 week): CI / Infra hardening (Dockerfile, build pipeline), observability + security remediation, BDD integration into CI. Deliverables: production build passing, monitoring enabled, BDD gates.

Attachments & references

- Requirements: [.agents/artifacts/requirement-docs/DASH-001.md](.agents/artifacts/requirement-docs/DASH-001.md), [.agents/artifacts/requirement-docs/DASH-002.md](.agents/artifacts/requirement-docs/DASH-002.md), [agents-phase-3-requirements.md](agents-phase-3-requirements.md)
- Key code: [db/schema.ts](db/schema.ts), [app/api/ai/route.ts](app/api/ai/route.ts), [app/api/objective/route.ts](app/api/objective/route.ts), [app/dashboard/page.tsx](app/dashboard/page.tsx)

Next steps

- If you approve, I will create the migration files and a small PR skeleton for Sprint 1 (no runtime changes until reviewed). Also I will update `agents-backlog.md` with the prioritized tickets.
