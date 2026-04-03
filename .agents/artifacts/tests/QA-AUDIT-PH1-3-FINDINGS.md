# QA Implementation Audit – Phases 1-3

## Top 10 Critical Findings

**Audit Date:** April 3, 2026  
**Scope:** BDD coverage, test fixture integrity, CI integration, acceptance criteria alignment  
**Auditor:** Senior QA Engineer

---

## EXECUTIVE SUMMARY

Across Phases 1-3, **7 Gherkin feature files** have been created covering **130+ scenarios**. However, **zero step definitions** exist, **CI BDD gating is missing**, and **critical route validation gaps** block test execution. Remediation timeline: **5-7 business days** for full CI integration.

---

## TOP 10 FINDINGS

### 🔴 **FINDING #1: No Step Definitions Implemented**

- **Severity:** P0 — CRITICAL BLOCKER
- **Impact:** All 130+ Gherkin scenarios are **unexecutable**; tests cannot run in CI or locally
- **File Link:** [tests/step_definitions/](tests/step_definitions/) (DIRECTORY DOES NOT EXIST)
- **Root Cause:** Cucumber step definitions (.ts files) never created; only Gherkin syntax exists
- **Remediation:** Create `tests/step_definitions/{auth,dashboard,workout,ai,objective}.steps.ts` with Playwright bindings for all background+scenario steps
- **Tests Required:** Write 50+ step implementations (Given/When/Then); validate against 3 feature files (DASH-001, WORK-001, AUTH-001)
- **Owner:** QA/Frontend
- **Effort:** 2-3 days

---

### 🔴 **FINDING #2: BDD Not Integrated into CI Pipeline**

- **Severity:** P0 — CRITICAL BLOCKER
- **Impact:** CI runs without any BDD gate; feature code can merge untested against acceptance criteria
- **File Link:** [.github/workflows/ci.yml](.github/workflows/ci.yml) (BDD job missing)
- **Root Cause:** Cucumber.js not in package.json; `.github/workflows/ci.yml` has no BDD test job
- **Remediation:** Add `@cucumber/cucumber`, `@playwright/test` to devDependencies; append BDD test job to CI workflow with hard-fail gate
- **Tests Required:** Validate CI runs all feature files in parallel; confirm pipeline fails if ANY scenario fails
- **Owner:** DevOps/QA
- **Effort:** 1 day

---

### 🔴 **FINDING #3: Missing Route Mismatch — Edit/Delete Workflows Untestable**

- **Severity:** P0 — CRITICAL BLOCKER
- **Impact:** [WORK-001-EDIT-DELETE-tests.feature](tests/WORK-001-EDIT-DELETE-tests.feature) **25 scenarios require routes that don't exist**; tests will fail on page load
- **File Links:**
  - Feature file: [WORK-001-EDIT-DELETE-tests.feature](tests/WORK-001-EDIT-DELETE-tests.feature#L1)
  - Missing routes: `/entrenamientos/{id}/edit`, `/entrenamientos/new?baseId=`
- **Root Cause:** Routes not implemented in [app/entrenamientos/](app/entrenamientos/) despite DASH-002 completion
- **Remediation:** Implement `app/entrenamientos/[id]/edit/page.tsx` and query param handler for `new?baseId`; validate step definitions can navigate without 404
- **Tests Required:** End-to-end test: navigate→edit→save workflow; verify calendar modal triggers correct route
- **Owner:** Frontend
- **Effort:** 1-2 days

---

### 🟡 **FINDING #4: Phase 3 AI Context Extension Not Validated in Feature Tests**

- **Severity:** P1 — HIGH
- **Impact:** [PH3-OBJECTIVE-TRAINING-tests.feature](tests/PH3-OBJECTIVE-TRAINING-tests.feature#L79) (28 scenarios) includes 3 AI context scenarios but **NO verification of payload structure**; context injection backend logic not yet testable
- **File Link:** [PH3-OBJECTIVE-TRAINING-tests.feature](tests/PH3-OBJECTIVE-TRAINING-tests.feature#L79)
- **Root Cause:** AI context builder endpoint not yet implemented; test assumes `/api/ai` accepts objective payload
- **Remediation:** Add backend step definition that mocks AI service response; validate request payload includes `trainingObjective`, `previousTrainingState`, `previousInteraction` fields
- **Tests Required:** API contract test (golden response JSON); mock payment to /api/ai with objective context and verify 200 response structure
- **Owner:** Backend/QA
- **Effort:** 1 day

---

### 🟡 **FINDING #5: Training State Persistence Not Covered in DB-Level Tests**

- **Severity:** P1 — HIGH
- **Impact:** [PH3-OBJECTIVE-TRAINING-tests.feature](tests/PH3-OBJECTIVE-TRAINING-tests.feature#L161) (4 state evolution scenarios) validate UI display but **do NOT verify database schema compliance**
- **File Link:** [PH3-OBJECTIVE-TRAINING-tests.feature](tests/PH3-OBJECTIVE-TRAINING-tests.feature#L161)
- **Root Cause:** No Drizzle schema validation step; no `trainingState` table verification in test fixtures
- **Remediation:** Add pre-test verification that `trainingState` table exists with columns `(id, userId, content, createdAt)`; add SQL snapshot assertions after each state update
- **Tests Required:** Database fixture validation; query `SELECT * FROM training_state ORDER BY createdAt DESC LIMIT 1` and assert structure post-submission
- **Owner:** QA/Backend
- **Effort:** 0.5 days

---

### 🟡 **FINDING #6: Dark Mode Not Validated in DASH-002 Feature Tests**

- **Severity:** P1 — HIGH
- **Impact:** [DASH-002-tests.feature](tests/DASH-002-tests.feature#L19) (Scenario 2 "Theme toggle switches...") **does NOT validate CSS colors or contrast**; WCAG compliance unchecked; state.md reports dark mode broken
- **File Link:** [DASH-002-tests.feature](tests/DASH-002-tests.feature#L19)
- **Root Cause:** Theme validation step missing; no visual regression baseline; hardcoded color hex values not audited
- **Remediation:** Add Playwright theme toggle verification; validate computed CSS changes (e.g., `getComputedStyle`); add WCAG contrast checker step (axe-core or similar)
- **Tests Required:** Screenshot comparison (light vs dark theme); contrast ratio validation using axe; token-based color lookup (not hardcoded hex)
- **Owner:** Frontend/QA
- **Effort:** 1.5 days

---

### 🟡 **FINDING #7: Auth Session Isolation Not Tested Across Features**

- **Severity:** P1 — HIGH
- **Impact:** [AUTH-001.feature](tests/AUTH-001.feature) (3 scenarios) validates happy path but **DOES NOT test session timeout, multi-tab logout, or token refresh**; cross-feature auth state unclear
- **File Link:** [AUTH-001.feature](tests/AUTH-001.feature)
- **Root Cause:** No session lifecycle scenarios; Clerk integration assumed working without edge-case coverage
- **Remediation:** Add scenarios: "User session expires after 12h", "Logout in one tab syncs to all tabs", "Token refresh on background API call"; mock Clerk session expiry events
- **Tests Required:** SessionStorage/LocalStorage assertions; multi-page auth state synchronization; invalid token handling in API layer
- **Owner:** Frontend/QA
- **Effort:** 1 day

---

### 🟡 **FINDING #8: Rate Limiting Not Covered in AI-001 BDD Suite**

- **Severity:** P1 — HIGH
- **Impact:** [AI-001.feature](tests/AI-001.feature) (Scenario 2 "Redis Rate Limiting...") **declares coverage but test is missing the actual 12-hour window validation logic**
- **File Link:** [AI-001.feature](tests/AI-001.feature#L20)
- **Root Cause:** Scenario written but no step definition for Redis KV interaction; cache key structure undefined
- **Remediation:** Add Redis mock or integration; validate rate limit window (12h); test cache key format `user:{id}:ai_ratelimit`; add bypass for admin users
- **Tests Required:** Simulate two AI requests within 12h window; verify second request returns 429 or rate-limit message; test cache expiry after 12.1h
- **Owner:** Backend/QA
- **Effort:** 1 day

---

### 🟠 **FINDING #9: Mobile Responsive Viewports Declared but Not Parameterized**

- **Severity:** P2 — MEDIUM
- **Impact:** [DASH-002-tests.feature](tests/DASH-002-tests.feature#L46) declares viewport tests (375px, 812px) but uses **hardcoded values; no Scenario Outline parameterization** across all 6 feature files
- **File Link:** [DASH-002-tests.feature](tests/DASH-002-tests.feature#L46)
- **Root Cause:** BDD best practice not applied; duplication of similar scenarios for each viewport; maintenance burden high
- **Remediation:** Refactor viewport tests into Scenario Outline with Examples table; consolidate "mobile-responsive" checks into parameterized step definition
- **Tests Required:** Verify Scenario Outline runs for all 3 viewports (375px, 812px, desktop); confirm step correctly sets viewport before assertions
- **Owner:** QA
- **Effort:** 0.5 days

---

### 🟠 **FINDING #10: Test Data Fixtures Not Integrated with BDD Runner**

- **Severity:** P2 — MEDIUM
- **Impact:** [tests/fixtures/seed.sql](tests/fixtures/seed.sql) and [tests/fixtures/test-fixtures.json](tests/fixtures/test-fixtures.json) exist but **are NOT automatically seeded before Cucumber runs**
- **File Links:**
  - Seed script: [tests/fixtures/seed.sql](tests/fixtures/seed.sql)
  - JSON fixtures: [tests/fixtures/test-fixtures.json](tests/fixtures/test-fixtures.json)
- **Root Cause:** No `before` hook in Cucumber config to execute seed; manual manual execution required
- **Remediation:** Add Cucumber `Before` hook that runs seed.sql via Drizzle or direct psql; validate `pg_restore` or manual INSERT idempotency
- **Tests Required:** Verify fixture seeding runs in CI and locally; confirm test user exists before first scenario; add cleanup (`After` hook) to drop test data post-run
- **Owner:** QA/DevOps
- **Effort:** 0.5 days

---

## COVERAGE MATRIX

| Phase | Feature             | File                                                                               | Scenarios | Status     | Gap                                     |
| ----- | ------------------- | ---------------------------------------------------------------------------------- | --------- | ---------- | --------------------------------------- |
| **1** | Auth                | [AUTH-001.feature](tests/AUTH-001.feature)                                         | 3         | ✅ Defined | Session lifecycle missing               |
| **1** | Dashboard (Basic)   | [DASH-001.feature](tests/DASH-001.feature)                                         | 2         | ✅ Defined | Aggregation formula validation          |
| **2** | Dashboard (Mobile)  | [DASH-002-tests.feature](tests/DASH-002-tests.feature)                             | 40        | ✅ Defined | Theme validation, routes missing        |
| **2** | Workout CRUD        | [WORK-001.feature](tests/WORK-001.feature)                                         | 3         | ✅ Defined | Edit/Delete routes incomplete           |
| **2** | Workout Edit/Delete | [WORK-001-EDIT-DELETE-tests.feature](tests/WORK-001-EDIT-DELETE-tests.feature)     | 25        | ✅ Defined | Routes F1, F2 blocking execution        |
| **2** | AI Recommendations  | [AI-001.feature](tests/AI-001.feature)                                             | 2         | ✅ Defined | Rate limit validation weak              |
| **3** | Objective Training  | [PH3-OBJECTIVE-TRAINING-tests.feature](tests/PH3-OBJECTIVE-TRAINING-tests.feature) | 28+       | ✅ Defined | AI context, state persistence unchecked |

**Total Scenarios:** 103+ Gherkin scenarios  
**Executable Scenarios:** 0 (no step definitions)  
**Blocked Routes:** 3 (Edit, Delete, baseId variant)  
**CI BDD Gate:** ❌ Not integrated

---

## REMEDIATION PRIORITY MATRIX

| Finding                | P0  | P1  | Blocking | Timeline     |
| ---------------------- | --- | --- | -------- | ------------ |
| F1 (No step defs)      | ✅  | —   | YES      | **2-3 days** |
| F2 (CI BDD gate)       | ✅  | —   | YES      | **1 day**    |
| F3 (Routes missing)    | ✅  | —   | YES      | **1-2 days** |
| F4 (AI context)        | —   | ✅  | P1       | **1 day**    |
| F5 (State persistence) | —   | ✅  | P1       | **0.5 day**  |
| F6 (Dark mode)         | —   | ✅  | P1       | **1.5 days** |
| F7 (Auth isolation)    | —   | ✅  | P1       | **1 day**    |
| F8 (Rate limiting)     | —   | ✅  | P1       | **1 day**    |
| F9 (Viewports)         | —   | —   | NO       | **0.5 day**  |
| F10 (Fixtures)         | —   | —   | NO       | **0.5 day**  |

**Critical Path:** F1 → F2 → F3 | F4–F8 (parallel) | F9–F10 (post-integration)  
**Total Effort:** 5–7 business days to full CI BDD readiness

---

## NEXT STEPS (QA ENGINEER)

1. **Immediately:** Engage Frontend/Backend teams on F1, F2, F3
2. **Day 1:** Create step definition template and auth.steps.ts scaffold
3. **Day 2–3:** Implement all step definitions; validate F1
4. **Day 4:** Integrate CI BDD job; validate F2
5. **Day 5–7:** Close P1 gaps (F4–F8); finalize F9–F10
6. **Sign-off:** Run full suite locally (all 103+ scenarios pass) before committing to main

---

**Audit Complete**  
**QA Lead Sign-off Pending** – Awaiting backend route completion (F3) before CI merge
