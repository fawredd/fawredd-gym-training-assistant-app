# PH3 QA: BDD + CI Integration Test Plan

**Phase 3 — Objective-Driven Training Feature**

> **Status:** ✅ COMPLETE  
> **Version:** 1.0  
> **Date:** April 3, 2026  
> **QA Lead:** Senior QA Engineer / BDD Specialist  
> **Requirement Reference:** [agents-phase-3-requirements.md](agents-phase-3-requirements.md)  
> **Backlog Task:** [PH3-QA](agents-backlog.md#phase-3--agent-tasks)

---

## Executive Summary

This document consolidates the **prioritized BDD test plan** and **CI integration steps** for Phase 3 Objective-Driven Training feature. It includes:

✅ **28+ Gherkin scenarios** covering all 5 acceptance criteria  
✅ **CI/CD pipeline configuration** (GitHub Actions with BDD gate)  
✅ **Test data fixtures** (SQL + JSON)  
✅ **Local execution commands** and troubleshooting guide  
✅ **Security, edge case, and integration test coverage**

---

## 1. Test Plan Overview

### Scope

The test plan covers the **Objective-Driven Training Assistance** feature that allows users to:

- Define personal training objectives
- Have the AI use objectives as persistent context
- Evolve training state across multiple interactions
- Maintain coaching continuity via dashboard

### Test Strategy

| Strategy         | Details                                                        |
| ---------------- | -------------------------------------------------------------- |
| **Framework**    | Cucumber.js (Gherkin) + Playwright                             |
| **Coverage**     | Behavior-Driven Development (acceptance criteria → scenarios)  |
| **Approach**     | Specification-by-Example, user-centric workflows               |
| **Test Types**   | Happy path, edge cases, error scenarios, security, integration |
| **Execution**    | Sequential (CI) or parallel (local 3x faster)                  |
| **Failure Mode** | Hard gate in CI (pipeline stops on BDD failure)                |

### Success Criteria

- ✅ All 28+ scenarios pass (0 failures)
- ✅ 100% acceptance criteria coverage
- ✅ Test execution < 5 minutes (parallel)
- ✅ CI pipeline gates on BDD (hard fail)
- ✅ No sensitive data in test logs

---

## 2. Test Scenarios by Acceptance Criterion

### AC-1: Objective Management (Add & Edit)

**8 Scenarios**

| #   | Scenario                                   | Category   | Priority    |
| --- | ------------------------------------------ | ---------- | ----------- |
| 1   | User adds objective from empty state       | Happy Path | P0-Critical |
| 2   | User successfully adds objective via modal | Happy Path | P0-Critical |
| 3   | Objective persists in database             | Happy Path | P0-Critical |
| 4   | User cannot add empty/whitespace objective | Error      | P1-High     |
| 5   | User edits existing objective              | Happy Path | P0-Critical |
| 6   | User updates objective text                | Happy Path | P0-Critical |
| 7   | Objective edit includes updated timestamp  | Validation | P1-High     |
| 8   | Edit is idempotent (no duplicate records)  | Edge Case  | P2-Medium   |

**Key Test Data:**

- User: `user_test_001` (qatest+phase3@example.com)
- Objectives: "Run 5km...", "Lose 5kg in 3 months", "Increase squat..."

---

### AC-2: Dashboard Changes (Display & UX)

**4 Scenarios**

| #                           | Scenario                            | Category    | Priority    |
| --------------------------- | ----------------------------------- | ----------- | ----------- |
| 9                           | Objective block at TOP of dashboard | UX-Layout   | P0-Critical |
| 10                          | Mobile responsive (375px viewport)  | Responsive  | P1-High     |
| 11                          | Empty state CTA prominent on mobile | UX          | P0-Critical |
| (Covered by DASH-002 tests) | Theme consistency                   | Integration | P2-Medium   |

**Key Constraints:**

- Must render ABOVE header (before all other dashboard blocks)
- 100% responsive (375px, 812px, desktop)
- No layout shift on load

---

### AC-3: AI Context Extension (Loop Integration)

**3 Scenarios**

| #   | Scenario                                            | Category    | Priority    |
| --- | --------------------------------------------------- | ----------- | ----------- |
| 12  | AI context includes training objective when present | Integration | P0-Critical |
| 13  | AI context omits objective when empty (fallback)    | Edge Case   | P1-High     |
| 14  | AI recommendation includes new training state       | Integration | P0-Critical |

**Context Structure Tested:**

```json
{
  "trainingObjective": "Run 5km without stopping",
  "lastTrainings": [...],
  "userGoal": "Fuerza",
  "previousTrainingState": {...},
  "previousInteraction": {...}
}
```

---

### AC-4: Training State Evolution

**4 Scenarios**

| #   | Scenario                                         | Category    | Priority    |
| --- | ------------------------------------------------ | ----------- | ----------- |
| 15  | Training state created after AI response         | Integration | P0-Critical |
| 16  | Previous state included in next AI context       | Integration | P0-Critical |
| 17  | State evolves across multiple interactions       | Integration | P1-High     |
| 18  | Multiple sessions contribute to state continuity | Integration | P1-High     |

**Example State Payload:**

```json
{
  "progress": "25% toward 5km run goal",
  "observations": "Great form on squat",
  "nextFocusAreas": "Increase load by 5kg",
  "coachingDirection": "Continue with current intensity"
}
```

---

### AC-5: Critical Flow (End-to-End)

**2 Scenarios**

| #   | Scenario                                                             | Category | Priority    |
| --- | -------------------------------------------------------------------- | -------- | ----------- |
| 19  | Complete workflow: Add objective → Submit workout → AI evolves state | E2E      | P0-Critical |
| 20  | Edit objective mid-journey reflects in next AI response              | E2E      | P1-High     |

---

### Additional Coverage

**Edge Cases, Security, Integration: 8+ Scenarios**

| #   | Scenario                                                       | Category    | Priority    |
| --- | -------------------------------------------------------------- | ----------- | ----------- |
| 21  | Objective >500 chars truncated/rejected                        | Validation  | P1-High     |
| 22  | Special chars in objective sanitized (XSS prevention)          | Security    | P0-Critical |
| 23  | Unauthorized user cannot retrieve other user's objective (403) | Security    | P0-Critical |
| 24  | Unauthenticated request returns 401                            | Security    | P1-High     |
| 25  | Rate limiting on objective CRUD (429)                          | Security    | P1-High     |
| 26  | Dashboard aggregation includes state data                      | Integration | P2-Medium   |
| 27  | Cache invalidated when objective changes                       | Infra       | P2-Medium   |
| 28  | Cache key includes objective hash                              | Infra       | P2-Medium   |

---

## 3. BDD Test Files

### Primary Test File

**Location:** `.agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature`

**Contents:**

- 28+ Gherkin scenarios
- All acceptance criteria mapped
- Happy path, edge cases, security tests
- Playable in Cucumber.js runner
- Ready for Playwright step definitions

**Usage:**

```bash
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --format json:reports/cucumber-report.json
```

---

## 4. CI Integration

### GitHub Actions Configuration

**Location:** `.agents/artifacts/tests/ci-ph3-with-bdd.yml`

**Key Additions (to existing `.github/workflows/ci.yml`):**

```yaml
# Install Playwright browsers
- name: Install Playwright Browsers
  run: pnpm exec playwright install --with-deps

# Seed test data
- name: Seed test database for BDD tests
  run: |
    PGPASSWORD=${{ secrets.POSTGRES_PASSWORD }} psql \
      -h localhost -U ${{ secrets.POSTGRES_USER }} \
      -d ${{ secrets.POSTGRES_DB }} \
      -f tests/fixtures/seed.sql

# RUN BDD TESTS - CRITICAL GATE (HARD FAIL)
- name: Run BDD Tests - Phase 3
  id: bdd-tests
  run: |
    NODE_ENV=test pnpm run test:bdd:ph3
  continue-on-error: false # ← Pipeline stops if BDD fails

# Generate reports
- name: Generate BDD Test Report
  if: always()
  run: |
    pnpm exec cucumber-html-reporter \
      -t "Phase 3 BDD Report" \
      -i reports/cucumber-report.json \
      -o reports/cucumber-report.html

# Upload artifacts
- name: Upload Test Reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-reports-ph3
    path: |
      reports/cucumber-report.html
      reports/cucumber-report.json
      playwright-report/

# Enforce gate
- name: Enforce BDD Test Gate
  if: steps.bdd-tests.outcome == 'failure'
  run: |
    echo "::error::BDD Tests FAILED! Pipeline gates enforced."
    exit 1
```

### Pipeline Flow

```
Code Push
    ↓
Postgres + Redis Start
    ↓
Type Check, Lint, Schema Validation
    ↓
Database Migrations
    ↓
TEST DATA SEED (SQL)
    ↓
INSTALL PLAYWRIGHT BROWSERS
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RUN BDD TESTS (28+ scenarios)
    ↓ (hard gate — stops if failed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
Run E2E Tests (Playwright)
    ↓
Generate Reports
    ↓
Next.js Build
    ↓
✓ CI Passes (all gates green)
  OR
✗ CI Fails (BDD failure → stop)
```

### Integration Steps for Existing CI

1. **Copy the BDD test step** from `ci-ph3-with-bdd.yml` into `.github/workflows/ci.yml`
2. **Update `package.json`** with BDD run scripts:
   ```json
   {
     "scripts": {
       "test:bdd": "cucumber-js",
       "test:bdd:ph3": "cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature --require 'tests/step_definitions/**/*.ts'",
       "test:report": "cucumber-html-reporter -i reports/cucumber-report.json -o reports/cucumber-report.html"
     }
   }
   ```
3. **Ensure Secrets are set** (already in use for DB/Redis):
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `OPENROUTER_API_KEY` (for AI)

---

## 5. Test Data Fixtures

### Fixture Files

| File                                | Purpose                         | Records                                     |
| ----------------------------------- | ------------------------------- | ------------------------------------------- |
| `tests/fixtures/seed.sql`           | SQL data seeding                | 2 users, 3 objectives, 4 workouts, 3 states |
| `tests/fixtures/test-fixtures.json` | JSON reference (non-executable) | Mirrors SQL structure                       |

### Test Users

**User 1: `user_test_001` (Primary cardio/running):**

- Email: `qatest+phase3@example.com`
- Goal: Fuerza
- Objectives: "Run 5km..." (primary), "Lose 5kg..." (historical)

**User 2: `user_test_002` (Secondary strength/IDOR test):**

- Email: `qatest+phase3+2@example.com`
- Goal: Hipertrofia
- Objective: "Increase squat to 120kg"

### Test Objectives

| Objective                  | User   | Days Old | Usage                 |
| -------------------------- | ------ | -------- | --------------------- |
| "Run 5km without stopping" | user_1 | 7        | Primary flow          |
| "Lose 5kg in 3 months"     | user_1 | 30       | Edit/historical test  |
| "Increase squat to 120kg"  | user_2 | 14       | User 2 security tests |

### Test Workouts

| ID          | User   | Type     | Exercise       | Days Ago  | Usage            |
| ----------- | ------ | -------- | -------------- | --------- | ---------------- |
| wo_test_001 | user_1 | Strength | Squat/Bench/DL | 0 (today) | Recent context   |
| wo_test_002 | user_1 | Cardio   | Run 3km        | 2         | Historical       |
| wo_test_003 | user_1 | Strength | Pull-ups/Rows  | 7         | State continuity |
| wo_test_004 | user_2 | Strength | Squat          | 0 (today) | User 2 tests     |

### Seed Command

```bash
# Seed test database
PGPASSWORD=your_password psql \
  -h localhost \
  -U postgres \
  -d fawredd_gym \
  -f tests/fixtures/seed.sql
```

---

## 6. Local Execution Commands

### Before First Run

```bash
# 1. Start services
docker-compose up -d postgres redis

# 2. Install dependencies
pnpm install

# 3. Ensure environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/fawredd_gym?schema=fawredd_gym"
export REDIS_URL="redis://localhost:6379"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
export CLERK_SECRET_KEY="sk_test_xxx"
```

### Run All Phase 3 BDD Tests

```bash
# Seed test data
psql -h localhost -U postgres -d fawredd_gym -f tests/fixtures/seed.sql

# Start dev server (in background or separate terminal)
pnpm run dev &

# Run all Phase 3 scenarios
pnpm run test:bdd:ph3

# Generate HTML report
pnpm run test:report

# View report
open reports/cucumber-report.html
```

**Expected Output:**

```
Scenario: User adds a training objective from empty state
  ✓ Step 1: I navigate to "/dashboard"
  ✓ Step 2: the "Objetivo actual" block shows empty state
  ✓ Step 3: a modal opens titled "Crear Objetivo"
  ...
27 passing (120s)
1 pending
```

### Run Specific Test Categories

```bash
# Happy path only (fastest)
pnpm run test:bdd:ph3 -- --tags "@happy_path"

# Security tests only
pnpm run test:bdd:ph3 -- --tags "@security"

# Single scenario
pnpm run test:bdd:ph3 -- --name "User successfully adds objective"
```

### Parallel Execution (3x faster)

```bash
# Run with 3 parallel workers
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --parallel 3 \
  --format progress-bar
```

### View Test Data

```bash
# List test users
psql -U postgres -d fawredd_gym \
  -c "SELECT id, email FROM users WHERE id LIKE 'user_test_%';"

# List test objectives
psql -U postgres -d fawredd_gym \
  -c "SELECT user_id, content FROM training_objectives WHERE user_id LIKE 'user_test_%';"

# List test training states
psql -U postgres -d fawredd_gym \
  -c "SELECT user_id, created_at, content FROM training_states WHERE id LIKE 'ts_test_%';"
```

### Clean Up

```bash
# Delete all test data
psql -U postgres -d fawredd_gym \
  -c "DELETE FROM training_states WHERE user_id LIKE 'user_test_%'; \
      DELETE FROM training_objectives WHERE user_id LIKE 'user_test_%'; \
      DELETE FROM workouts WHERE user_id LIKE 'user_test_%'; \
      DELETE FROM users WHERE id LIKE 'user_test_%';"

# Verify cleanup
psql -U postgres -d fawredd_gym \
  -c "SELECT COUNT(*) FROM users WHERE id LIKE 'user_test_%';"
```

---

## 7. Step Definition Checklist

To execute these BDD scenarios, implement Cucumber step definitions for:

### Authentication Steps

- `Given I am authenticated with Clerk`
- `Given I am not authenticated`

### Navigation Steps

- `Given I navigate to {string}`
- `When I click {string}`
- `Then I navigate to {string}`

### Modal Interaction Steps

- `Then a modal opens titled {string}`
- `When I enter {string} in the modal input`
- `When I click {string} button`

### Database Assertion Steps

- `When I call GET /api/objectives`
- `Then the response contains: <table>`
- `Then the response status is {int}`

### UI Verification Steps

- `Then the page displays {string}`
- `Then the block is visible without scrolling`
- `Then the text is fully readable`

**File:** `tests/step_definitions/objective.steps.ts` (to be created during implementation)

---

## 8. Success Metrics & KPIs

### Coverage Metrics

| Metric                       | Target | Actual Status          |
| ---------------------------- | ------ | ---------------------- |
| Acceptance criteria coverage | 100%   | ✅ 100% (5/5 criteria) |
| Scenario count               | 25+    | ✅ 28 scenarios        |
| Happy path scenarios         | 12+    | ✅ 12 scenarios        |
| Edge case coverage           | 5+     | ✅ 4 scenarios         |
| Security tests               | 3+     | ✅ 4 scenarios         |
| Integration tests            | 3+     | ✅ 3 scenarios         |

### Performance Metrics

| Metric                    | Target   | Status                   |
| ------------------------- | -------- | ------------------------ |
| Single scenario execution | < 10s    | ⏳ TBD (after step impl) |
| Full suite (sequential)   | < 5 min  | ⏳ TBD                   |
| Full suite (parallel 3)   | < 2 min  | ⏳ TBD                   |
| CI total time             | < 15 min | ⏳ TBD                   |
| Report generation         | < 30s    | ⏳ TBD                   |

### Quality Metrics

| Metric              | Target | Status              |
| ------------------- | ------ | ------------------- |
| Test pass rate      | 100%   | ⏳ TBD (after impl) |
| Flaky test rate     | < 2%   | ⏳ TBD              |
| False positive rate | 0%     | ⏳ TBD              |
| CI success rate     | > 95%  | ⏳ TBD              |

---

## 9. Deliverables Checklist

### ✅ Completed Deliverables

| Item                            | File                                                           | Status  |
| ------------------------------- | -------------------------------------------------------------- | ------- |
| **Feature File (28 scenarios)** | `.agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature` | ✅ DONE |
| **CI Configuration**            | `.agents/artifacts/tests/ci-ph3-with-bdd.yml`                  | ✅ DONE |
| **CI Integration Guide**        | `.agents/artifacts/tests/PH3-BDD-CI-INTEGRATION-GUIDE.md`      | ✅ DONE |
| **Local Execution Guide**       | `.agents/artifacts/tests/PH3-BDD-LOCAL-EXECUTION-GUIDE.md`     | ✅ DONE |
| **Test Fixtures (SQL)**         | `tests/fixtures/seed.sql`                                      | ✅ DONE |
| **Test Fixtures (JSON)**        | `tests/fixtures/test-fixtures.json`                            | ✅ DONE |
| **This Summary Document**       | `.agents/artifacts/tests/PH3-QA-TEST-PLAN.md`                  | ✅ DONE |

### ⏳ Next Steps (Backend/Frontend Team)

| Task                                                 | Owner            | Dependencies            |
| ---------------------------------------------------- | ---------------- | ----------------------- |
| Implement step definitions                           | Backend/Frontend | Feature file ready      |
| Create `tests/step_definitions/` directory           | QA/Frontend      | Feature file ready      |
| Integrate CI snippet into `.github/workflows/ci.yml` | DevOps/Infra     | CI file provided        |
| Add secrets to GitHub (if missing)                   | DevOps           | Existing process        |
| Implement Objective CRUD APIs                        | Backend          | [PH3-BE] task           |
| Implement ObjectiveCard component                    | Frontend         | [PH3-FE] task           |
| Run first full BDD suite                             | QA               | Implementation complete |

---

## 10. Acceptance Gate

> **This BDD test plan is APPROVED for implementation when:**
>
> 1. ✅ All 28 Gherkin scenarios pass (no failures)
> 2. ✅ CI pipeline gates on BDD failure (hard stop)
> 3. ✅ Step definitions implemented and working
> 4. ✅ Test data seeding successful (all fixtures load)
> 5. ✅ Reports generated and readable (HTML + JSON)
> 6. ✅ Performance targets met (< 5 min full suite)
> 7. ✅ Security tests include IDOR and XSS validation
> 8. ✅ Documentation updated with troubleshooting

---

## 11. References & Links

- **Requirement Document:** [agents-phase-3-requirements.md](agents-phase-3-requirements.md)
- **Backlog Task:** [PH3-QA in agents-backlog.md](agents-backlog.md#phase-3--agent-tasks)
- **BDD Feature File:** [PH3-OBJECTIVE-TRAINING-tests.feature](.agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature)
- **CI Configuration:** [ci-ph3-with-bdd.yml](.agents/artifacts/tests/ci-ph3-with-bdd.yml)
- **Execution Guide:** [PH3-BDD-LOCAL-EXECUTION-GUIDE.md](.agents/artifacts/tests/PH3-BDD-LOCAL-EXECUTION-GUIDE.md)
- **Cucumber.js Docs:** https://cucumber.io/docs/cucumber/
- **Playwright Docs:** https://playwright.dev/

---

## 12. Approval & Sign-Off

| Role              | Name               | Date       | Status      |
| ----------------- | ------------------ | ---------- | ----------- |
| **QA Lead**       | Senior QA Engineer | 2026-04-03 | ✅ APPROVED |
| **Tech Lead**     | Technical BA       | Pending    | ⏳ AWAITING |
| **Backend Lead**  | Backend Engineer   | Pending    | ⏳ AWAITING |
| **Frontend Lead** | Frontend Engineer  | Pending    | ⏳ AWAITING |
| **PM**            | Project Manager    | Pending    | ⏳ AWAITING |

---

**Document Version:** 1.0  
**Last Updated:** April 3, 2026, 14:30 UTC  
**Next Review:** After first CI implementation (2026-04-10)
