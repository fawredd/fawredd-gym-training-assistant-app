# REQUIREMENT DOC: AUTH-001
Status: [APPROVED]
Role: Technical BA

## 1. Feature Description
Integration of Clerk Authentication, setup of the base project layout, and initialization of the database schema (Drizzle + Vercel Postgres) focusing on the User entity.

## 2. Acceptance Criteria
- [ ] The app uses Clerk Provider effectively to wrap the Next.js application.
- [ ] Users can sign up / sign in using Clerk default UI components (`<SignIn />`, `<SignUp />`).
- [ ] Next.js Middleware is configured to protect routes such as `/dashboard` and `/entrenamientos`.
- [ ] Drizzle ORM is initialized (`schema.ts` created, db connection established).
- [ ] The `User` database model exists (id, external_auth_id, nombre, edad, peso, altura, objetivo, experiencia).
- [ ] A mechanism (e.g. Clerk Webhooks or first-login sync) ensures when a user auths, a corresponding row in the user table exists.

## 3. Tech Notes
- Use `@clerk/nextjs`
- Drizzle config uses `postgres.js` or `@vercel/postgres` drivers.

## SECURITY REVIEW
[APPROVED]
- Route protection provided via standard nextjs Clerk middleware setup.
- Parameterized queries and schema safety handled by Drizzle ORM.
- Clerk handles PII hashing/salting outside application scope.
