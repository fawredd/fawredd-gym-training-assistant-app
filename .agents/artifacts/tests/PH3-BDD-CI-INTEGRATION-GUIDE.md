# PH3 BDD + CI Integration Guide

## Overview

This guide provides the CI integration steps to run Behavior-Driven Development (BDD) tests for Phase 3 Objective-Driven Training feature using **Playwright + Cucumber**.

## Why Playwright + Cucumber?

- **Playwright**: Excellent cross-browser support, fast execution, good API mocking
- **Cucumber**: Industry-standard BDD format, readable Gherkin syntax, strict separation of concerns
- **Integration**: Both are Node.js native, perfect for Next.js applications

---

## 1. Local Setup (Development Environment)

### 1.1 Install Dependencies

```bash
# Install Playwright, Cucumber, and related tools
pnpm add -D @playwright/test @cucumber/cucumber @cucumber/pretty-formatter

# Optional: For better test reporting
pnpm add -D cucumber-html-reporter
```

### 1.2 Create Cucumber Configuration

Create a `cucumber.js` file in the project root:

```javascript
const common = `
  --strict
  --format progress-bar
  --format json:reports/cucumber-report.json
  features/**/*.feature
  --require-module ts-node/register
  --require-module tsconfig-paths/register
  --require 'tests/step_definitions/**/*.ts'
`;

module.exports = {
  default: common,
  ci: `
    ${common}
    --parallel 3
    --fail-fast
  `,
};
```

### 1.3 Create Playwright Config

Create `playwright.config.ts` in the project root:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,

  fullyParallel: true,
  workers: process.env.CI ? 1 : 3,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "reports/playwright-report.json" }],
  ],

  webServer: {
    command: "pnpm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

### 1.4 Create Step Definitions Directory

```bash
mkdir -p tests/step_definitions
mkdir -p tests/fixtures
mkdir -p tests/support
```

---

## 2. Test Fixtures & Test Data

### 2.1 Sample User Fixture (`tests/fixtures/users.json`)

```json
{
  "testUser1": {
    "id": "user_test_001",
    "email": "qatest+phase3@example.com",
    "firstName": "QA",
    "lastName": "Tester",
    "goal": "Fuerza",
    "clerkId": "clerk_test_001"
  },
  "testUser2": {
    "id": "user_test_002",
    "email": "qatest+phase3+2@example.com",
    "firstName": "Trainer",
    "lastName": "Test",
    "goal": "Hipertrofia",
    "clerkId": "clerk_test_002"
  }
}
```

### 2.2 Sample Objective Fixtures (`tests/fixtures/objectives.json`)

```json
{
  "objectives": [
    {
      "content": "Run 5km without stopping",
      "userId": "user_test_001",
      "createdAt": "2026-04-03T10:00:00Z",
      "updatedAt": "2026-04-03T10:00:00Z"
    },
    {
      "content": "Increase squat to 120kg",
      "userId": "user_test_002",
      "createdAt": "2026-04-03T11:00:00Z",
      "updatedAt": "2026-04-03T11:00:00Z"
    },
    {
      "content": "Lose 5kg in 3 months",
      "userId": "user_test_001",
      "createdAt": "2026-03-01T09:00:00Z",
      "updatedAt": "2026-04-02T14:30:00Z"
    }
  ]
}
```

### 2.3 Sample Workouts Fixture (`tests/fixtures/workouts.json`)

```json
{
  "workouts": [
    {
      "id": "wo_test_001",
      "userId": "user_test_001",
      "date": "2026-04-03",
      "exercises": [
        {
          "name": "Squat",
          "sets": 5,
          "reps": 5,
          "weight": 100,
          "unit": "kg"
        },
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": 8,
          "weight": 85,
          "unit": "kg"
        }
      ],
      "duration": 45,
      "aiSuggestedNext": "Increase squat weight by 5kg next session"
    },
    {
      "id": "wo_test_002",
      "userId": "user_test_001",
      "date": "2026-04-01",
      "exercises": [
        {
          "name": "Run",
          "type": "cardio",
          "duration": 20,
          "distance": 3,
          "unit": "km"
        }
      ],
      "duration": 20,
      "aiSuggestedNext": "Great cardio session! Consider adding 30s to your next run."
    }
  ]
}
```

### 2.4 Sample Training State Fixtures (`tests/fixtures/training-states.json`)

```json
{
  "trainingStates": [
    {
      "id": "ts_test_001",
      "userId": "user_test_001",
      "content": {
        "progress": "25% toward squat goal",
        "observations": "Excellent form maintained throughout all sets",
        "nextFocusAreas": "Increase load by 5kg when comfortable",
        "coachingDirection": "Continue with current intensity, focus on consistency"
      },
      "createdAt": "2026-04-03T10:15:00Z"
    },
    {
      "id": "ts_test_002",
      "userId": "user_test_001",
      "content": {
        "progress": "50% toward 5km run goal",
        "observations": "Cardiovascular capacity improving steadily",
        "nextFocusAreas": "Add 500m each week",
        "coachingDirection": "Maintain current pace, gradually increase distance"
      },
      "createdAt": "2026-04-01T09:30:00Z"
    }
  ]
}
```

### 2.5 Seed Test Data with SQL (`tests/fixtures/seed.sql`)

```sql
-- Clear existing test data
DELETE FROM training_states WHERE user_id IN ('user_test_001', 'user_test_002');
DELETE FROM training_objectives WHERE user_id IN ('user_test_001', 'user_test_002');
DELETE FROM exercises WHERE workout_id LIKE 'wo_test_%';
DELETE FROM workouts WHERE id LIKE 'wo_test_%';
DELETE FROM users WHERE clerk_id LIKE 'clerk_test_%';

-- Insert test users
INSERT INTO users (id, clerk_id, email, first_name, last_name, goal, created_at)
VALUES
  ('user_test_001', 'clerk_test_001', 'qatest+phase3@example.com', 'QA', 'Tester', 'Fuerza', NOW()),
  ('user_test_002', 'clerk_test_002', 'qatest+phase3+2@example.com', 'Trainer', 'Test', 'Hipertrofia', NOW());

-- Insert test training objectives
INSERT INTO training_objectives (id, user_id, content, created_at, updated_at)
VALUES
  ('obj_test_001', 'user_test_001', 'Run 5km without stopping', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
  ('obj_test_002', 'user_test_002', 'Increase squat to 120kg', NOW() - INTERVAL '14 days', NOW()),
  ('obj_test_003', 'user_test_001', 'Lose 5kg in 3 months', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days');

-- Insert test workouts
INSERT INTO workouts (id, user_id, date, duration_minutes, ai_suggested_next, created_at)
VALUES
  ('wo_test_001', 'user_test_001', NOW()::date, 45, 'Increase squat weight by 5kg next session', NOW() - INTERVAL '2 hours'),
  ('wo_test_002', 'user_test_001', (NOW() - INTERVAL '2 days')::date, 20, 'Great cardio session!', NOW() - INTERVAL '2 days');

-- Insert test training states
INSERT INTO training_states (id, user_id, content, created_at)
VALUES
  ('ts_test_001', 'user_test_001', '{"progress":"25% toward squat goal","observations":"Excellent form","nextFocusAreas":"Increase load by 5kg","coachingDirection":"Continue with current intensity"}', NOW() - INTERVAL '2 hours'),
  ('ts_test_002', 'user_test_001', '{"progress":"50% toward 5km run goal","observations":"Cardiovascular capacity improving","nextFocusAreas":"Add 500m each week","coachingDirection":"Maintain current pace"}', NOW() - INTERVAL '2 days');
```

---

## 3. GitHub Actions CI Configuration

### 3.1 Updated CI Job with BDD Tests

Add or update the BDD test step in `.github/workflows/ci.yml`:

```yaml
# --- Install Playwright Browsers ---
- name: Install Playwright Browsers
  run: pnpm exec playwright install --with-deps

# --- Run BDD Feature Tests (Cucumber + Playwright) ---
- name: Run BDD Tests - Phase 3 Objective-Driven Features
  run: |
    echo "Seeding test database..."
    PGPASSWORD=${{ secrets.POSTGRES_PASSWORD }} psql \
      -h localhost \
      -U ${{ secrets.POSTGRES_USER }} \
      -d ${{ secrets.POSTGRES_DB }} \
      -f tests/fixtures/seed.sql

    echo "Running Cucumber BDD tests with Playwright..."
    NODE_ENV=test pnpm run test:bdd:ph3
  env:
    POSTGRES_URL: postgresql://${{ secrets.POSTGRES_USER }}:${{ secrets.POSTGRES_PASSWORD }}@localhost:5432/${{ secrets.POSTGRES_DB }}?schema=fawredd_gym
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1
  continue-on-error: false

# --- Run Playwright E2E Tests ---
- name: Run Playwright E2E Tests
  run: pnpm exec playwright test
  env:
    POSTGRES_URL: postgresql://${{ secrets.POSTGRES_USER }}:${{ secrets.POSTGRES_PASSWORD }}@localhost:5432/${{ secrets.POSTGRES_DB }}?schema=fawredd_gym

# --- Generate BDD Test Report ---
- name: Generate BDD Test Report
  if: always()
  run: |
    if [ -f reports/cucumber-report.json ]; then
      pnpm exec cucumber-html-reporter \
        -t "Phase 3 BDD Test Report" \
        -i reports/cucumber-report.json \
        -o reports/cucumber-report.html
    fi

# --- Upload Test Artifacts ---
- name: Upload Test Reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-reports-ph3
    path: |
      reports/cucumber-report.html
      reports/cucumber-report.json
      playwright-report/
    retention-days: 30

# --- Fail Pipeline if Tests Fail ---
- name: BDD Test Gate (Fail if any scenario failed)
  if: failure()
  run: |
    echo "::error::BDD tests failed! Check the test report for details."
    exit 1
```

### 3.2 Add Scripts to `package.json`

```json
{
  "scripts": {
    "test": "pnpm run test:unit && pnpm run test:bdd",
    "test:unit": "jest",
    "test:bdd": "pnpm run test:bdd:all",
    "test:bdd:all": "cucumber-js --config-file cucumber.js --profile default",
    "test:bdd:ph3": "cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature --require-module ts-node/register --require-module tsconfig-paths/register --require 'tests/step_definitions/**/*.ts'",
    "test:bdd:ci": "cucumber-js --config-file cucumber.js --profile ci",
    "test:e2e": "playwright test",
    "test:report": "cucumber-html-reporter -t 'BDD Test Report' -i reports/cucumber-report.json -o reports/cucumber-report.html"
  }
}
```

---

## 4. Local Test Execution

### 4.1 Run All Phase 3 BDD Tests Locally

```bash
# Ensure environment variables are set
export DATABASE_URL="postgresql://user:password@localhost:5432/fawredd_gym?schema=fawredd_gym"
export REDIS_URL="redis://localhost:6379"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="xxxx"
export CLERK_SECRET_KEY="xxxx"

# Seed test data
psql -h localhost -U postgres -d fawredd_gym -f tests/fixtures/seed.sql

# Start dev server in background
pnpm run dev &
DEV_PID=$!

# Wait for server to boot
sleep 5

# Run specific Phase 3 feature tests
pnpm run test:bdd:ph3

# Run all BDD scenarios
pnpm run test:bdd

# Run Playwright E2E tests
pnpm run test:e2e

# Kill dev server
kill $DEV_PID
```

### 4.2 Run Tests with Specific Tag

```bash
# Run only critical flows (@critical tag)
cucumber-js \
  .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@critical" \
  --require-module ts-node/register \
  --require 'tests/step_definitions/**/*.ts'

# Run only security tests (@security tag)
cucumber-js \
  .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@security" \
  --require-module ts-node/register \
  --require 'tests/step_definitions/**/*.ts'

# Run only integration tests (@integration tag)
cucumber-js \
  .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@integration" \
  --require-module ts-node/register \
  --require 'tests/step_definitions/**/*.ts'
```

### 4.3 Run Tests in Parallel

```bash
# Run 3 parallel workers for faster execution
cucumber-js \
  --config-file cucumber.js \
  --parallel 3 \
  --format progress-bar \
  --format json:reports/cucumber-report.json
```

### 4.4 Generate HTML Report

```bash
# After tests complete, generate visual report
pnpm run test:report

# Open in browser
open reports/cucumber-report.html
```

---

## 5. Step Definition Template

Create `tests/step_definitions/objective.steps.ts`:

```typescript
import { Given, When, Then, And } from "@cucumber/cucumber";
import { chromium, BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

let context: BrowserContext;
let page: Page;

Given("I am authenticated with Clerk", async function () {
  // Implementation: Sign in user via test account or JWT token
});

Given("I navigate to {string}", async function (url: string) {
  page = await context.newPage();
  await page.goto(url);
});

When("I click {string}", async function (elementName: string) {
  await page.click(`text=${elementName}`);
});

Then("the page displays {string}", async function (expectedText: string) {
  const content = await page.textContent("body");
  expect(content).toContain(expectedText);
});

// Add more steps as needed...
```

---

## 6. CI Pipeline Execution Flow

```
push to main/develop
        ↓
GitHub Actions Triggered
        ↓
Setup Services (Postgres, Redis)
        ↓
Install Dependencies
        ↓
Type Check (tsc)
        ↓
Lint Check (ESLint)
        ↓
Schema Validation (Drizzle)
        ↓
Database Migrations (drizzle-kit up)
        ↓
Seed Test Data (tests/fixtures/seed.sql)
        ↓
RUN BDD TESTS (Cucumber + Playwright) ← CRITICAL GATE
        ↓
(if BDD passes)
   ↓
RUN E2E TESTS (Playwright)
   ↓
Generate Test Reports
   ↓
Upload Artifacts
   ↓
Build Next.js Application
        ↓
Summary Report
        ↓
✓ CI Passes (all gates green)
  OR
✗ CI Fails (any test fails → pipeline stops)
```

---

## 7. Troubleshooting Guide

| Issue                                  | Solution                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| "Postgres connection timeout"          | Check if `services.postgres` is running: `docker ps`. Ensure CI secrets are set. |
| "Playwright browsers not installed"    | Run `pnpm exec playwright install --with-deps`                                   |
| "Test data not seeding"                | Verify `tests/fixtures/seed.sql` permissions. Check `POSTGRES_URL` env var.      |
| "Port 3000 already in use"             | Kill existing process: `lsof -ti:3000 \| xargs kill`                             |
| "Redis connection refused"             | Ensure `services.redis` started. Check port 6379.                                |
| "Cucumber can't find step definitions" | Verify `require` path in `cucumber.js`. Check TS compilation.                    |

---

## 8. Monitoring & Metrics

### Success Criteria

- [ ] All 28+ BDD scenarios pass (0 failures)
- [ ] Playwright E2E tests pass (100% success rate)
- [ ] Test execution time < 5 minutes (parallel execution)
- [ ] No flaky tests (< 2% retry rate)
- [ ] Code coverage > 70% for PH3 features
- [ ] Zero test data pollution between runs

### Key Metrics to Track

- **Test Duration**: Target < 300s for full Phase 3 suite
- **Flakiness**: < 2% of scenarios re-run due to failures
- **Coverage**: Aim for >80% of acceptance criteria covered
- **CI Success Rate**: > 95% (failures should be real code issues, not test issues)

---

## References

- [Cucumber.js Documentation](https://cucumber.io/docs/cucumber/)
- [Playwright Documentation](https://playwright.dev/)
- [Gherkin Syntax Guide](https://cucumber.io/docs/gherkin/reference/)
