# INFRASTRUCTURE.md — CI & Redis Configuration Plan

**Last Updated:** April 3, 2026  
**Phase:** Phase 3 — Infrastructure (PH3-INF)  
**Status:** [DRAFT] — Ready for team review

---

## Table of Contents

1. [CI Workflow Overview](#ci-workflow-overview)
2. [Drizzle Migrations in CI](#drizzle-migrations-in-ci)
3. [Redis Configuration Guide](#redis-configuration-guide)
4. [Environment Variables Audit](#environment-variables-audit)
5. [Dev → Prod Parity Checklist](#dev--prod-parity-checklist)
6. [Required GitHub Secrets](#required-github-secrets)
7. [Quick Start](#quick-start)

---

## CI Workflow Overview

### Location

`.github/workflows/ci.yml`

### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Workflow Steps

| Step                 | Purpose                                 | Condition                      |
| -------------------- | --------------------------------------- | ------------------------------ |
| Checkout             | Clone repository                        | Always                         |
| Setup pnpm           | Install package manager                 | Always                         |
| Setup Node           | Install Node.js v20                     | Always                         |
| Install dependencies | pnpm install                            | Always                         |
| Setup .env           | Create CI environment file from secrets | Always                         |
| Wait for Postgres    | Health check for database               | Always                         |
| Wait for Redis       | Health check for cache                  | Always                         |
| TypeScript check     | `tsc --noEmit`                          | Always (fails build if errors) |
| ESLint               | `pnpm run lint`                         | Always (continues on error)    |
| Drizzle generate     | Schema validation                       | Always                         |
| Drizzle schema check | Detect new/modified migrations          | Continues on error             |
| Migrations run       | Apply pending migrations                | Always                         |
| Tests (placeholder)  | Run test suite if present               | Continues on error             |
| Build                | `next build`                            | Always (fails build if errors) |

### Services Running During CI

#### PostgreSQL 15 Alpine

```yaml
Host: localhost
Port: 5432
Database: ${POSTGRES_DB}
User: ${POSTGRES_USER}
Password: ${POSTGRES_PASSWORD}
```

#### Redis 7 Alpine

```yaml
Host: localhost
Port: 6379
Auth: none (for CI)
```

### CI Environment Variables

The workflow creates `.env.ci` before running which includes:

```bash
NODE_ENV=test
POSTGRES_DB=<from secrets>
POSTGRES_USER=<from secrets>
POSTGRES_PASSWORD=<from secrets>
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_URL=postgresql://user:pass@localhost:5432/db?schema=fawredd_gym
DATABASE_URL=postgresql://user:pass@localhost:5432/db?schema=fawredd_gym
APP_DB_SCHEMA=fawredd_gym
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from secrets>
CLERK_SECRET_KEY=<from secrets>
OPENROUTER_API_KEY=<from secrets>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Key property:** All CI runs are **independent** — each run uses fresh containerized DB and Redis.

---

## Drizzle Migrations in CI

### Overview

Drizzle Kit is used to manage database schema migrations. In CI, we:

1. **Generate** schema files from `db/schema.ts`
2. **Validate** that the schema is consistent with committed migrations
3. **Apply** all pending migrations to the CI database
4. **Verify** the database is in the expected state

### Commands

#### 1. Generate Migration Files (Local Dev)

```bash
# Generate new migration files if schema.ts has changed
pnpm exec drizzle-kit generate --dialect postgresql
```

**When to run:** After modifying `db/schema.ts`  
**Output:** New files in `db/migrations/`  
**Action:** Commit migration files to version control

#### 2. Validate Schema (Local Dev)

```bash
# Check if schema.ts and migrations are in sync
pnpm exec drizzle-kit check --dialect postgresql
```

**When to run:** Before committing schema changes  
**Output:** Errors if migrations are missing or inconsistent  
**Action:** Run `drizzle-kit generate` to fix

#### 3. Push Migrations to Database (Local Dev)

```bash
# Apply all pending migrations to the database
pnpm run db:push
```

**When to run:** After schema changes in development  
**Danger:** This is destructive — it can alter/delete data in development DB  
**From package.json:** Runs `drizzle-kit push --force`

#### 4. Migrate (Production Safe)

```bash
# Apply migrations without schema override (production-safe)
pnpm exec drizzle-kit migrate --dialect postgresql
```

**When to run:** In production deployment pipelines  
**Safety:** Does NOT override existing schema; fails if migration conflicts exist  
**Recommended:** Use in production CI/CD

### CI Drizzle Steps

**Step: Validate database schema**

```bash
pnpm exec drizzle-kit generate --dialect postgresql
```

- Detects if schema has diverged from migrations
- Does NOT modify database
- Fails if inconsistencies found

**Step: Verify schema consistency**

```bash
pnpm exec drizzle-kit up --dialect postgresql
```

- Applies schema to CI database
- Used to validate migrations can be applied
- Uses fresh CI database, so safe to run destructively

**Step: Run database migrations**

```bash
pnpm run db:push
```

- Final migration apply before tests/build
- Ensures CI database schema matches production expectations

### Migration File Structure

```
db/
├── schema.ts              # Authoritative schema definition
├── index.ts               # Database client exports
└── migrations/
    ├── 0000_init.sql      # Initial schema
    ├── 0001_add_users.sql # Schema changes
    └── meta/
        └── _journal.json  # Drizzle internal tracking
```

**Key rule:** Always commit migration files to version control.

---

## Redis Configuration Guide

### Architecture Overview

**Local Development (Docker Compose)**

- Redis 7 Alpine container
- No authentication
- Persistent volume: `redisdata:/data`

**Vercel Deployment**

- Vercel Redis (KV) service
- Connection string provided via `VERCEL_KV_REST_API_URL` or similar

**Upstash (Alternative)**

- Redis-compatible, serverless
- Connection via Redis URL

### Local Docker Configuration

#### docker-compose.yml Service

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redisdata:/data
```

#### Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=         # Empty for local Docker
REDIS_URL=redis://localhost:6379
```

#### Connection Code (Node.js)

```typescript
// Using @vercel/kv (recommended for Vercel deployment)
import { kv } from "@vercel/kv";

// Or using redis npm package
import { createClient } from "redis";

const client = createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
});

await client.connect();
```

### Vercel Redis (KV) Configuration

#### 1. Create KV Store

**Steps:**

1. Dashboard → Project Settings → Storage
2. Create new KV store
3. Note the connection string

#### 2. Environment Variables for Vercel

Set in Vercel project dashboard:

```bash
# Option A: Use Vercel's native VERCEL_KV_* variables
VERCEL_KV_REST_API_URL=https://...
VERCEL_KV_REST_API_TOKEN=eyJ...

# Option B: Use standard Redis URL
REDIS_URL=redis://default:abc123@xyz.upstash.io:12345
```

#### 3. Code Integration

```typescript
// Using Vercel KV directly
import { kv } from "@vercel/kv";

export async function getCacheKey(key: string) {
  return await kv.get(key);
}

export async function setCacheKey(key: string, value: any) {
  await kv.set(key, value, { ex: 3600 });
}
```

### Upstash Redis Configuration

#### 1. Create Upstash Database

**Steps:**

1. Go to https://console.upstash.com/
2. Create new Redis database (global region recommended)
3. Copy connection string

#### 2. Environment Variables

```bash
# Copy from Upstash console
REDIS_URL=redis://default:xxxxxxxxxxx@abc-12345.upstash.io:12345
REDIS_HOST=abc-12345.upstash.io
REDIS_PORT=12345
REDIS_PASSWORD=xxxxxxxxxxx
```

#### 3. Code Integration

```typescript
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, // Upstash requires TLS
  },
});

await client.connect();
```

### Redis Configuration Matrix

| Property    | Local Docker             | Vercel KV     | Upstash                                     |
| ----------- | ------------------------ | ------------- | ------------------------------------------- |
| Host        | localhost                | N/A (REST)    | {domain}.upstash.io                         |
| Port        | 6379                     | N/A           | 12345 (or custom)                           |
| Auth        | None                     | Token-based   | Password-based                              |
| TLS         | No                       | N/A           | Yes (required)                              |
| Connection  | Direct TCP               | REST API      | Direct TCP + TLS                            |
| Persistence | Volume-based             | Managed       | Managed                                     |
| Sample URL  | `redis://localhost:6379` | `https://...` | `redis://default:pass@xyz.upstash.io:12345` |

### Redis Connection String Examples

#### Local

```bash
REDIS_URL=redis://localhost:6379
```

#### Upstash

```bash
REDIS_URL=redis://default:AQq1ABCDEFGHIJKLmnopqrstuvwxyz123@xyz-12345.upstash.io:12345
```

#### Vercel

```bash
REDIS_URL=redis://default:AQq1ABCDEFGHIJKLmnopqrstuvwxyz123@abc-12345.upstash.io:12345
```

### Caching Strategy for Phase 3

**Objective + Training State Caching:**

When caching AI responses that depend on user objectives:

```typescript
// Key structure includes objective hash to create cache variants
const objectiveHash = crypto
  .createHash("sha256")
  .update(userObjective)
  .digest("hex")
  .substring(0, 8);

const cacheKey = `ai:recommendation:${userId}:${objectiveHash}`;

// Set with TTL
await redis.set(cacheKey, aiResponse, "EX", 3600); // 1 hour TTL

// Check for objective changes to invalidate cache
// When objective updates, clear old cache keys
```

---

## Environment Variables Audit

### Audit Status: ✓ [APPROVED]

All required environment variables are documented in `.env.example`.

### Completeness Check: ✓ PASS

**Required variables present:**

#### Database (Postgres)

- ✓ `POSTGRES_DB` — Database name
- ✓ `POSTGRES_USER` — Database user
- ✓ `POSTGRES_PASSWORD` — Database password
- ✓ `POSTGRES_HOST` — Database host
- ✓ `POSTGRES_PORT` — Database port (default: 5432)
- ✓ `POSTGRES_URL` — Full connection string with schema param
- ✓ `DATABASE_URL` — Alternate connection string (optional)
- ✓ `APP_DB_SCHEMA` — Schema name (fawredd_gym)

#### Redis / Cache

- ✓ `REDIS_URL` — Full connection string
- ✓ `REDIS_HOST` — Redis host
- ✓ `REDIS_PORT` — Redis port
- ✓ `REDIS_PASSWORD` — Redis password (optional)
- ✓ `VERCEL_REDIS_URL` — Vercel-specific (optional)

#### Authentication (Clerk)

- ✓ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Public frontend key
- ✓ `CLERK_SECRET_KEY` — Secret server key

#### AI Provider

- ✓ `OPENROUTER_API_KEY` — OpenRouter API key (server-side)

#### Application Runtime

- ✓ `NEXT_PUBLIC_APP_URL` — Base URL for callbacks
- ✓ `NODE_ENV` — Node environment (development/production/test)

### Security Audit: ✓ PASS

**No hardcoded secrets in:**

- .env.example ✓ (only placeholders)
- docker-compose.yml ✓ (uses ${ENV} syntax)
- drizzle.config.ts ✓ (uses process.env)
- next.config.ts ✓ (no config hardcoding)
- Application code ✓ (no sample keys committed)

### Naming Convention: ✓ PASS

All variables follow `UPPERCASE_SNAKE_CASE` with correct prefixes:

| Prefix         | Service            | Example                             |
| -------------- | ------------------ | ----------------------------------- |
| `POSTGRES_`    | PostgreSQL         | `POSTGRES_URL`, `POSTGRES_PASSWORD` |
| `REDIS_`       | Redis              | `REDIS_HOST`, `REDIS_PASSWORD`      |
| `NEXT_PUBLIC_` | Frontend exposable | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `CLERK_`       | Auth service       | `CLERK_SECRET_KEY`                  |
| `OPENROUTER_`  | AI provider        | `OPENROUTER_API_KEY`                |
| `APP_`         | Application        | `APP_DB_SCHEMA`                     |
| `NODE_ENV`     | Runtime            | Node environment                    |

### Recommendations for Phase 3

**No critical missing variables.**

**Optional enhancements (nice-to-have):**

1. **`LOG_LEVEL`** — Control verbosity

   ```bash
   LOG_LEVEL=debug|info|warn|error
   ```

2. **`APP_ENVIRONMENT_NAME`** — For observability

   ```bash
   APP_ENVIRONMENT_NAME=development|staging|production
   ```

3. **`NEXTAUTH_SECRET`** (if switching to NextAuth)

   ```bash
   NEXTAUTH_SECRET=your_secret_here
   ```

4. **`REDIS_DB`** — Redis database number (for multi-tenant local dev)

   ```bash
   REDIS_DB=0
   ```

5. **`DRIZZLE_DEBUG`** — Enable ORM debug logging
   ```bash
   DRIZZLE_DEBUG=true
   ```

---

## Dev → Prod Parity Checklist

### Pre-Deployment Validation

#### Database

- [ ] Migration files committed to git (`db/migrations/`)
- [ ] `db/schema.ts` and migrations are in sync (run `drizzle-kit check`)
- [ ] `POSTGRES_URL` includes `schema=fawredd_gym` parameter
- [ ] Database has been initialized (run `pnpm run db:init`)
- [ ] All migrations applied locally (run `pnpm run db:push`)
- [ ] Backup created before production deployment

#### Redis

- [ ] Redis cache is configured (local Docker or Vercel/Upstash)
- [ ] `REDIS_URL` is set and validated
- [ ] TLS enabled if using Upstash/cloud provider (do NOT use TLS for local Docker)
- [ ] Connection pooling configured if needed for production scale
- [ ] Redis persistence is enabled (for stateful cache use cases)
- [ ] Expire policies set on cache keys (TTL values)

#### Environments

**Local Development**

```bash
✓ NODE_ENV=development
✓ POSTGRES_URL=postgresql://fawredd:...@localhost:5432/fawredd_gym?schema=fawredd_gym
✓ REDIS_URL=redis://localhost:6379
✓ DEBUG flags may be enabled
```

**CI/Test**

```bash
✓ NODE_ENV=test
✓ POSTGRES_URL=postgresql://...@localhost:5432/fawredd_gym?schema=fawredd_gym (containerized)
✓ REDIS_URL=redis://localhost:6379 (containerized)
✓ Fresh database for each run
```

**Vercel Production**

```bash
✓ NODE_ENV=production
✓ POSTGRES_URL=<Vercel Postgres URL with schema param>
✓ REDIS_URL=redis://default:<token>@<domain>.upstash.io:12345
✓ Debug flags disabled
✓ TLS enabled for Redis
✓ No localhost references
```

#### Environment Variable Matrix

| Variable              | Dev                     | CI                      | Prod                     |
| --------------------- | ----------------------- | ----------------------- | ------------------------ |
| `NODE_ENV`            | `development`           | `test`                  | `production`             |
| `POSTGRES_HOST`       | `localhost`             | `localhost`             | `*.postgres.vercel.com`  |
| `REDIS_HOST`          | `localhost`             | `localhost`             | `*.upstash.io`           |
| `REDIS_PASSWORD`      | empty                   | empty                   | secret token             |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `http://localhost:3000` | `https://yourdomain.com` |
| `CLERK_SECRET_KEY`    | dev key                 | test key                | prod key                 |
| `OPENROUTER_API_KEY`  | dev key                 | test key                | prod key                 |

#### Application Code

- [ ] No `console.log` debugging left in production code
- [ ] Error handling uses structured logging (not throwing to console)
- [ ] All "TODO" or "FIXME" comments resolved or moved to backlog
- [ ] Environment-specific code paths are explicit (check `NODE_ENV`)

#### Secrets Management

- [ ] All secrets use GitHub Secrets (for CI)
- [ ] All secrets set in Vercel project settings (for production)
- [ ] No `.env.prod` file committed (use Vercel dashboard only)
- [ ] `.env.local` is in `.gitignore`
- [ ] `POSTGRES_PASSWORD` and API keys never appear in logs

#### Docker & CI

- [ ] CI workflow runs successfully on all commits to `main`/`develop`
- [ ] No flaky tests (runs 3x to verify consistency)
- [ ] Build artifacts are reproducible
- [ ] Container images use pinned versions (e.g., `postgres:15-alpine`)

#### Vercel Deployment

- [ ] Project linked to GitHub repository
- [ ] Environment variables set in Vercel dashboard (not `.env` file)
- [ ] Preview deployments enabled
- [ ] Automatic deployments on main branch enabled
- [ ] Preview comments on PRs enabled
- [ ] Build command: `pnpm run build`
- [ ] Start command: `pnpm start`

---

## Required GitHub Secrets

### For CI Pipeline

Set these in **GitHub Repository Settings → Secrets and variables → Actions**:

```
POSTGRES_DB           = fawredd_gym
POSTGRES_USER         = fawredd
POSTGRES_PASSWORD     = <strong random password for CI only>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = <dev clerk key>
CLERK_SECRET_KEY      = <dev clerk secret key>
OPENROUTER_API_KEY    = <dev openrouter api key>
```

**Example secret values for CI (safe because CI-only):**

```
POSTGRES_PASSWORD=ci_test_password_12345
CLERK_SECRET_KEY=test_secret_abc123xyz
```

**⚠️ IMPORTANT:** These are **CI-only** credentials. They are _not_ production secrets. Use different values for Vercel production deployment.

### For Production (Vercel Dashboard)

Set directly in Vercel project settings:

```
POSTGRES_URL          = <Vercel Postgres connection string>
REDIS_URL             = <Upstash or Vercel Redis URL>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = <prod clerk key>
CLERK_SECRET_KEY      = <prod clerk secret key>
OPENROUTER_API_KEY    = <prod openrouter api key>
NEXT_PUBLIC_APP_URL   = https://yourdomain.com
```

---

## Quick Start

### 1. Setup Local Development

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Start Docker services (Postgres + Redis)
docker-compose up -d

# 3. Wait for services to be ready (health checks)
sleep 5

# 4. Install dependencies
pnpm install

# 5. Initialize database
pnpm run db:init

# 6. Apply migrations
pnpm run db:push

# 7. Start dev server
pnpm run dev
```

### 2. Setup CI/GitHub Actions

```bash
# 1. Create repository secrets (GitHub → Settings → Secrets)
#    Set: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD,
#         NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, OPENROUTER_API_KEY

# 2. Commit CI workflow file
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push

# 3. Watch workflow run in GitHub → Actions
```

### 3. Setup Production (Vercel)

```bash
# 1. Connect Vercel to GitHub repository (vercel.com/import)

# 2. Create Postgres database (Vercel → Storage → Postgres)

# 3. Create Redis cache (Upstash → Console → Create database OR Vercel → Storage → KV)

# 4. Set environment variables in Vercel dashboard

# 5. Trigger deploy (automatic on main branch push)
```

### 4. Validate Migrations Before Commit

```bash
# After modifying db/schema.ts, always:
pnpm exec drizzle-kit generate --dialect postgresql
pnpm exec drizzle-kit check --dialect postgresql
git add db/migrations/
git commit -m "Add migration for [feature]"
```

---

## References

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Postgres](https://vercel.com/docs/storage/postgres)
- [Vercel KV (Redis)](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis](https://upstash.com/docs/redis/quick-start)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

---

## Approval Gates

- [ ] **Technical BA:** Architecture + Deployment Spec `[APPROVED]`
- [ ] **Security Engineer:** Environment & secrets handling `[APPROVED]`
- [ ] **QA Engineer:** CI workflow integrates with BDD suite
- [ ] **Backend Engineer:** Database migrations compatible with schema
- [ ] **Infrastructure Engineer:** All configs tested locally and in CI

---

**Created by:** Infrastructure Engineer  
**Date:** April 3, 2026  
**Next Steps:** Integrate with QA BDD test suite + Security audit review
