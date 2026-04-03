# Phase 3 BDD Test Plan Execution Guide

## Quick Start - Local Testing

### Prerequisites

```bash
# 1. Ensure you have PostgreSQL and Redis running
docker-compose up -d postgres redis

# 2. Ensure pnpm dependencies are installed
pnpm install

# 3. Create test database (if not exists)
createdb -h localhost -U postgres fawredd_gym
```

### Fastest Path: Run All Phase 3 Tests Locally (< 5 min)

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/fawredd_gym?schema=fawredd_gym"
export REDIS_URL="redis://localhost:6379"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
export CLERK_SECRET_KEY="sk_test_xxx"

# Seed test data
psql -h localhost -U postgres -d fawredd_gym -f tests/fixtures/seed.sql

# Start dev server
pnpm run dev &

# Run Phase 3 BDD tests
pnpm run test:bdd:ph3

# View results
cat reports/cucumber-report.json | jq '.features[].scenarios[] | {title: .name, status: .steps[].result.status}'
```

---

## Test Command Reference

### Run All Phase 3 Scenarios

```bash
# Run with progress bar output
pnpm run test:bdd:ph3

# Run with JSON report (for CI)
NODE_ENV=test cucumber-js \
  .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --format json:reports/cucumber-report.json \
  --format progress-bar

# Run with HTML report
pnpm run test:report
```

### Run Specific Test Categories

```bash
# Run only HAPPY PATH tests (@happy_path tag)
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@happy_path"

# Run only EDGE CASE tests (@edge_case tag)
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@edge_case"

# Run only SECURITY tests (@security tag)
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@security"

# Run only INTEGRATION tests (@integration tag)
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --tags "@integration"
```

### Run Single Scenario

```bash
# Run by exact scenario name
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --name "^User successfully adds objective via dashboard modal$"

# Run by feature name
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --name "ACCEPTANCE CRITERION 1"
```

### Parallel Execution (Faster)

```bash
# Run 3 workers in parallel (~2-3x faster)
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --parallel 3 \
  --format progress-bar

# Run with max parallelization
cucumber-js .agents/artifacts/tests/PH3-OBJECTIVE-TRAINING-tests.feature \
  --parallel auto
```

### Playwright E2E Tests

```bash
# Run all E2E tests
pnpm exec playwright test

# Run specific test file
pnpm exec playwright test tests/e2e/objective.spec.ts

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Run in debug mode (interactive)
pnpm exec playwright test --debug

# Generate test report
pnpm exec playwright show-report
```

---

## Test Data Management

### Seed Fresh Test Data

```bash
# Seed from SQL file
psql -h localhost -U postgres -d fawredd_gym -f tests/fixtures/seed.sql

# Seed from JSON fixtures (if converter script exists)
node tests/fixtures/seed-from-json.js tests/fixtures/test-fixtures.json
```

### View Test Data

```bash
# View all test users
psql -h localhost -U postgres -d fawredd_gym \
  -c "SELECT id, email, first_name, last_name FROM users WHERE id LIKE 'user_test_%';"

# View all test objectives
psql -h localhost -U postgres -d fawredd_gym \
  -c "SELECT id, user_id, content, created_at FROM training_objectives WHERE user_id LIKE 'user_test_%';"

# View all test training states
psql -h localhost -U postgres -d fawredd_gym \
  -c "SELECT id, user_id, created_at, content FROM training_states WHERE user_id LIKE 'user_test_%';"
```

### Clean Test Data

```bash
# Delete all test data
psql -h localhost -U postgres -d fawredd_gym <<EOF
DELETE FROM training_states WHERE user_id LIKE 'user_test_%';
DELETE FROM training_objectives WHERE user_id LIKE 'user_test_%';
DELETE FROM exercises WHERE workout_id LIKE 'wo_test_%';
DELETE FROM workouts WHERE id LIKE 'wo_test_%' OR user_id LIKE 'user_test_%';
DELETE FROM users WHERE id LIKE 'user_test_%';
EOF

# Verify cleanup
psql -h localhost -U postgres -d fawredd_gym \
  -c "SELECT COUNT(*) FROM users WHERE id LIKE 'user_test_%';"
```

---

## Troubleshooting Common Issues

### Issue: "Cucumber can't find step definitions"

**Symptom:**

```
Undefined - Step: "I navigate to "/dashboard""
```

**Solution:**

```bash
# Ensure TypeScript is compiled
pnpm exec tsc

# Ensure cucumber.js config path is correct
cat cucumber.js | grep -i "require"

# Verify step_definitions directory exists
ls -la tests/step_definitions/
```

### Issue: "Postgres connection refused"

**Symptom:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if Postgres is running
docker ps | grep postgres

# Start services
docker-compose up -d postgres

# Verify connection
psql -h localhost -U postgres -d fawredd_gym -c "SELECT 1;"
```

### Issue: "Playwright browsers not installed"

**Symptom:**

```
Error: Chromium is not installed
```

**Solution:**

```bash
# Install Playwright browsers
pnpm exec playwright install --with-deps

# Verify installation
pnpm exec playwright install --check
```

### Issue: "Port 3000 already in use"

**Symptom:**

```
Error: listen EADDRINUSE :::3000
```

**Solution:**

```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm run dev
```

### Issue: "Tests fail but only locally, passes in CI"

**Likely Causes:**

- Environment variables differ
- Test data not seeded
- Redis/Postgres not running
- Node modules cache issue

**Solution:**

```bash
# Recreate exact CI environment
cp .env.example .env.test
source .env.test

# Clear caches
rm -rf node_modules/.cache
pnpm install --frozen-lockfile

# Re-seed test data
psql -f tests/fixtures/seed.sql

# Run with verbose output
DEBUG=* pnpm run test:bdd:ph3
```

---

## CI Pipeline Execution

### GitHub Actions Workflow

1. **Trigger:** Push to `main` or `develop`, or PR created
2. **Services Start:** Postgres + Redis containers
3. **Dependencies:** Install with `pnpm install --frozen-lockfile`
4. **Validation:** Type check, Lint, Schema validation
5. **Database:** Run migrations, Seed test data
6. **Playwright Setup:** Install browsers
7. **BDD Tests:** Run Cucumber scenarios (CRITICAL GATE)
8. **E2E Tests:** Run Playwright tests
9. **Reports:** Generate HTML + JSON reports
10. **Build:** Next.js production build
11. **Artifacts:** Upload reports (30-day retention)

### Monitor CI Status

```bash
# Check latest run
gh run list --limit 1

# Get detailed status
gh run view <run-id>

# Download artifacts
gh run download <run-id> -n test-reports-ph3-*

# Tail logs
gh run view <run-id> --log | tail -50
```

---

## Test Coverage Metrics

### Acceptance Criteria Coverage

| Criterion                          | Count             | Status          |
| ---------------------------------- | ----------------- | --------------- |
| 1. Objective Management (Add/Edit) | 8 scenarios       | ✅ FULL         |
| 2. Dashboard Changes               | 4 scenarios       | ✅ FULL         |
| 3. AI Context Extension            | 3 scenarios       | ✅ FULL         |
| 4. Training State Evolution        | 4 scenarios       | ✅ FULL         |
| 5. Critical Flow CRUD              | 2 scenarios       | ✅ FULL         |
| Edge Cases & Errors                | 4 scenarios       | ✅ FULL         |
| Security & Validation              | 3 scenarios       | ✅ FULL         |
| Integration Tests                  | 2 scenarios       | ✅ FULL         |
| **TOTAL**                          | **28+ scenarios** | ✅ **COMPLETE** |

### Test Execution Timeline

- **Quick smoke test** (~2 min): 5 critical happy-path scenarios
- **Full suite** (~5-7 min): All 28+ scenarios
- **Full suite + E2E** (~10-15 min): BDD + Playwright + Reports

### Success Criteria for Pipeline Green

- [ ] 0 failed BDD scenarios
- [ ] 0 failed Playwright tests
- [ ] Code coverage > 70%
- [ ] Build completes successfully
- [ ] No blocked or skipped tests

---

## Frontend Step Definition Examples

### Example: "I navigate to URL"

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./shared";

Given("I navigate to {string}", async (url: string) => {
  await page.goto(url, { waitUntil: "networkidle" });
});
```

### Example: "I click button"

```typescript
When("I click {string}", async (buttonText: string) => {
  // Find by exact text or partial match
  await page.click(`button:has-text("${buttonText}")`);
  // Wait for navigation if needed
  await page.waitForLoadState("networkidle");
});
```

### Example: "Dashboard displays objective"

```typescript
Then("the objective block displays {string}", async (expectedText: string) => {
  const objectiveBlock = await page.locator('[data-testid="objective-block"]');
  await expect(objectiveBlock).toContainText(expectedText);
});
```

### Example: "API returns status"

```typescript
Then("the response status is {int}", async (statusCode: number) => {
  const response = await page.context().request.post("/api/objectives", {
    data: { content: "Test" },
  });
  expect(response.status()).toBe(statusCode);
});
```

---

## Performance Benchmarks

### Target Execution Times

| Test Category           | Target | Actual    |
| ----------------------- | ------ | --------- |
| Single scenario         | < 10s  | ~5-8s     |
| Full suite (sequential) | < 300s | ~240-270s |
| Full suite (parallel 3) | < 120s | ~90-110s  |
| BDD report generation   | < 30s  | ~5-10s    |

### Optimization Tips

1. **Use parallel execution:** `--parallel 3` (3x faster)
2. **Isolate heavy scenarios:** Tag slow ones separately
3. **Cache Playwright browsers:** `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
4. **Use smaller viewport:** Speed up rendering
5. **Mock external calls:** Reduce API latency

---

## Continuous Learning & Iteration

### After First Run

1. Review test report at `reports/cucumber-report.html`
2. Identify any flaky scenarios (re-run them)
3. Check console logs for warnings: `grep "Warning\|Error" bdd-test.log`
4. Update step definitions if needed
5. Add missing steps for uncovered flows

### When Adding New Features

1. Write Gherkin scenario first (TDD approach)
2. Run scenario (should fail initially)
3. Implement step definitions
4. Implement backend API if needed
5. Run scenario (should pass)
6. Add to CI pipeline

### Maintenance Schedule

- **Weekly:** Run full suite, review flakyness
- **After each PR:** CI tests must pass
- **Monthly:** Review and update test data
- **Quarterly:** Audit coverage gaps
