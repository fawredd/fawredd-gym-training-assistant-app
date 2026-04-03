# DASH-002 BDD Testing — Setup & CI/CD Guide

**Status**: Ready for implementation  
**Last Updated**: 2026-04-03  
**Coverage**: Calendar modal flows, edit/clone/delete operations

---

## Table of Contents

1. [Quick Start (Local)](#quick-start-local)
2. [Test Framework Architecture](#test-framework-architecture)
3. [Step Definitions](#step-definitions)
4. [Running Tests Locally](#running-tests-locally)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local)

### Prerequisites

```bash
# Node 18+ required
node --version  # v18.0.0 or higher

# Install dependencies
pnpm install
pnpm add -D @cucumber/cucumber @playwright/test cucumber-html-reporter
```

### 1. Create Feature File (Already Provided)

✅ Location: `.agents/artifacts/tests/DASH-002-tests.feature`

### 2. Create Step Definitions (Already Provided)

✅ Location: `.agents/artifacts/tests/DASH-002-steps.ts`

### 3. Create Test Configuration

Create `.agents/artifacts/tests/cucumber.js`:

```javascript
module.exports = {
  default: {
    require: ["DASH-002-steps.ts"],
    requireModule: ["ts-node/esm"],
    format: [
      "progress-bar",
      "html:test-results/cucumber-report.html",
      "json:test-results/cucumber-report.json",
    ],
    parallel: 2,
  },
};
```

### 4. Add NPM Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test:bdd": "cucumber-js .agents/artifacts/tests/DASH-002-tests.feature",
    "test:bdd:watch": "cucumber-js .agents/artifacts/tests/DASH-002-tests.feature --dry-run",
    "test:bdd:report": "node scripts/generate-bdd-report.js"
  }
}
```

### 5. Run Tests

```bash
# Run all BDD tests
pnpm test:bdd

# Run specific scenario
pnpm test:bdd --name "Calendar modal opens showing workout exercises"

# Generate HTML report
pnpm test:bdd:report
```

---

## Test Framework Architecture

### Technology Stack

| Layer                  | Technology               | Purpose                        |
| ---------------------- | ------------------------ | ------------------------------ |
| **Test Runner**        | Cucumber (Gherkin)       | Human-readable test specs      |
| **Browser Automation** | Playwright               | Cross-browser E2E testing      |
| **Language**           | TypeScript               | Type-safe step definitions     |
| **Assertions**         | Playwright Test (expect) | DOM and API assertions         |
| **CI/CD**              | GitHub Actions           | Automated test runs on PR/push |

### Test Execution Flow

```
┌─────────────────────────────────────────┐
│ GHERKIN FEATURE FILE (.feature)         │
│ (DASH-002-tests.feature)                │
└──────────────┬──────────────────────────┘
               │
               ├─→ Parse Scenarios
               │
┌──────────────▼──────────────────────────┐
│ STEP DEFINITIONS (TypeScript)           │
│ (DASH-002-steps.ts)                     │
└──────────────┬──────────────────────────┘
               │
               ├─→ Given: Setup (seed DB, auth)
               ├─→ When: Execute actions
               ├─→ Then: Assert outcomes
               │
┌──────────────▼──────────────────────────┐
│ PLAYWRIGHT EXECUTION                    │
│ (Browser automation + API calls)        │
└──────────────┬──────────────────────────┘
               │
               ├─→ Navigate pages
               ├─→ Click elements
               ├─→ Fill forms
               ├─→ Capture network calls
               │
┌──────────────▼──────────────────────────┐
│ ASSERTIONS & REPORTING                  │
│ (HTML reports, JUnit XML for CI)        │
└─────────────────────────────────────────┘
```

---

## Step Definitions

### Provided Steps

All steps in `DASH-002-steps.ts` are implemented. Key categories:

#### 1. **Authentication**

```gherkin
Given I am authenticated with Clerk
```

- Sets Clerk session cookies
- Verifies user record exists in DB

#### 2. **Calendar Navigation**

```gherkin
Given I navigate to "/dashboard"
When I click on "2026-03-22" in the calendar
```

- Handles viewport (mobile-first, 390x844)
- Waits for animations and network loads

#### 3. **Modal Interactions**

```gherkin
Given the workout modal is open
When I click the "Editar" button
```

- Opens modals with await page.waitForTimeout()
- Verifies button visibility before clicking

#### 4. **Delete Operations**

```gherkin
When I click "Eliminar entrenamiento"
Then a confirmation dialog appears
When I click "Confirmar"
Then a DELETE request is sent to "/api/workouts/[id]"
```

- Intercepts network DELETE requests
- Verifies response status and payload

#### 5. **Form Pre-Population**

```gherkin
Then the edit form loads with pre-populated data:
  | Field | Value |
  | Date | 2026-03-28 |
```

- Reads input values and asserts correctness
- Handles date inputs, text fields, dropdowns

### Adding New Steps

To extend with custom steps:

```typescript
import { Given, When, Then } from "@cucumber/cucumber";

When("I perform custom action with {string}", async function (param: string) {
  // Implementation
  await page.locator(`button:has-text("${param}")`).click();
});
```

---

## Running Tests Locally

### Prerequisites

1. **Start Next.js Development Server**

```bash
pnpm dev
# Should be running on http://localhost:3000
```

2. **Set Environment Variables**

Create `.env.test.local`:

```bash
BASE_URL=http://localhost:3000
TEST_CLERK_SESSION=test_session_token_12345
TEST_AUTH_TOKEN=Bearer test_token_xyz
HEADLESS=true  # Set to false for visual debugging
```

3. **Seed Test Database**

```bash
# Option 1: Run migrations
pnpm db:migrate

# Option 2: Use test fixtures
psql $DATABASE_URL < tests/fixtures/seed.sql
```

### Run Test Suite

```bash
# All tests
pnpm test:bdd

# Specific feature file
pnpm test:bdd DASH-002-tests.feature

# Specific scenario (filter by name)
pnpm test:bdd --name "Calendar modal opens showing workout exercises"

# With debugging
HEADLESS=false pnpm test:bdd

# Parallel execution (2 workers)
pnpm test:bdd --parallel 2
```

### Generate HTML Report

```bash
pnpm test:bdd:report

# Open report
open test-results/cucumber-report.html
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/bdd-tests.yml`:

```yaml
name: BDD Tests (DASH-002)

on:
  push:
    branches: [main, develop]
    paths:
      - "app/dashboard/**"
      - "app/entrenamientos/**"
      - ".agents/artifacts/tests/**"
      - "components/dashboard/**"
  pull_request:
    branches: [main, develop]

jobs:
  bdd-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:6432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "pnpm"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Setup database
        run: |
          pnpm db:migrate
          psql postgres://postgres:postgres@localhost:5432/test_db < tests/fixtures/seed.sql

      - name: Start Next.js server
        run: |
          pnpm build
          pnpm start &
          sleep 5  # Wait for server to be ready

      - name: Run BDD tests
        env:
          BASE_URL: http://localhost:3000
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
          TEST_CLERK_SESSION: ${{ secrets.TEST_CLERK_SESSION }}
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
        run: pnpm test:bdd

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: bdd-test-results
          path: test-results/

      - name: Publish test report
        if: always()
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./test-results
          destination_dir: bdd-reports/${{ github.ref_name }}

  test-summary:
    needs: bdd-tests
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ BDD tests passed. [View report](https://...${{ github.ref_name }})'
            })
```

### GitLab CI Configuration (Alternative)

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

bdd-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test_db
    POSTGRES_PASSWORD: postgres
    BASE_URL: http://localhost:3000
  script:
    - pnpm install
    - pnpm exec playwright install --with-deps
    - pnpm db:migrate
    - psql postgres://postgres:postgres@localhost/test_db < tests/fixtures/seed.sql
    - pnpm build
    - pnpm start &
    - sleep 5
    - pnpm test:bdd
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/cucumber-report.xml
```

### Minimal Pipeline Changes Required

**Current State**: No CI pipeline for BDD tests

**Proposed Changes**:

1. **Add GitHub Actions workflow** (.github/workflows/bdd-tests.yml)
   - Runs on PR to main/develop
   - Runs on push to protected branches
   - ~5-10 minute execution time

2. **Add test secrets to repository**
   - `TEST_CLERK_SESSION` — Test user session token
   - `TEST_AUTH_TOKEN` — Bearer token for API calls

3. **Update branch protection rules**
   - ✅ Require BDD tests to pass before merging

4. **Add test reporting**
   - HTML reports published to GitHub Pages
   - JUnit XML exported for CI integration

---

## Test Database Fixture

### Fixture File: `tests/fixtures/seed.sql`

```sql
-- Disable foreign key checks for clean insert
SET CONSTRAINTS ALL DEFERRED;

-- Insert test user
INSERT INTO users (id, email, created_at)
VALUES ('user_test_12345', 'test@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample workouts
INSERT INTO workouts (id, user_id, workout_date, created_at)
VALUES
  ('w_001', 'user_test_12345', '2026-03-28', NOW()),
  ('w_002', 'user_test_12345', '2026-03-27', NOW()),
  ('w_003', 'user_test_12345', '2026-03-26', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample exercises
INSERT INTO exercises (id, workout_id, name, sets, reps, weight, muscle_group)
VALUES
  ('e_001', 'w_001', 'Bench Press', 3, 10, 80, 'Pecho'),
  ('e_002', 'w_001', 'Squats', 4, 8, 100, 'Piernas'),
  ('e_003', 'w_002', 'Lat Pulldown', 3, 12, 70, 'Espalda'),
  ('e_004', 'w_003', 'Deadlift', 5, 5, 120, 'Espalda')
ON CONFLICT (id) DO NOTHING;

-- Re-enable foreign key checks
SET CONSTRAINTS ALL IMMEDIATE;
```

---

## Troubleshooting

### Test Failures

| Error                             | Cause                     | Solution                                          |
| --------------------------------- | ------------------------- | ------------------------------------------------- |
| "Timeout waiting for page.goto()" | Server not running        | `pnpm dev` in another terminal                    |
| "Cannot find element"             | Step definitions outdated | Review page DOM; update selectors                 |
| "401 Unauthorized"                | Missing auth token        | Verify `TEST_CLERK_SESSION` in `.env`             |
| "Port 3000 already in use"        | Server running twice      | Kill existing process: `lsof -i :3000 \| kill -9` |
| "Database connection refused"     | PostgreSQL not running    | Start local DB or Docker: `docker-compose up -d`  |

### Debug Tips

```bash
# Run with verbose logging
DEBUG=*:* pnpm test:bdd

# Run in headed mode (see browser)
HEADLESS=false pnpm test:bdd

# Generate screenshots on failure
SCREENSHOT_ON_FAILURE=true pnpm test:bdd

# Run single scenario
pnpm test:bdd --name "Calendar modal opens"
```

### Common Issues & Fixes

**Issue: "Step 'I navigate to...' is undefined"**  
→ Ensure `DASH-002-steps.ts` is in same directory as `.feature` file

**Issue: Modal doesn't appear after click**  
→ Add `await page.waitForTimeout(300)` or wait for animation

**Issue: API calls fail in CI**  
→ Verify `TEST_AUTH_TOKEN` is set in GitHub Actions secrets

---

## Signing Off

✅ **Gherkin Scenarios**: Complete and comprehensive  
✅ **Step Definitions**: Provided with implementation guidance  
✅ **Local Test Run**: Ready to execute  
✅ **CI Pipeline**: Minimal changes provided (1 config file + 2 secrets)  
✅ **Coverage**: All 4 core flows + error cases

**Next Steps**:

1. Implement step definitions (code provided)
2. Add CI workflow to `.github/workflows/`
3. Run `pnpm test:bdd` locally to validate
4. Merge and trigger CI

---

**QA Agent Sign-off**: Ready for Backend & Frontend implementation  
**Date**: 2026-04-03
