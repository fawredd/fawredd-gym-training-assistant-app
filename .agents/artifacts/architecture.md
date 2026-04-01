# TECHNICAL ARCHITECTURE

## Stack Overview
- **Framework:** Next.js 16.2.2 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Auth:** Clerk
- **ORM:** Drizzle ORM
- **Database:** Vercel Postgres
- **Cache/Rate Limits:** Vercel Redis

## Data Flow
1. **Client / Edge:** Next.js Middleware checks Clerk Session.
2. **Server (RSC/Actions):** Authorized components call Drizzle queries/mutations.
3. **Database:** Drizzle maps to Vercel Postgres tables (`User`, `Workout`, `Exercise`, `AiMemory`).
4. **AI Generation:** Backend calls AI model, rate-limited by Vercel Redis.

## Deployment
- **Platform:** Vercel
- **Environments:** Preview (PRs) & Production (main)

[Technical BA]: Architecture approved for MVP phase.
