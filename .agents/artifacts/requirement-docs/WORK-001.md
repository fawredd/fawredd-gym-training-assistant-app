# REQUIREMENT DOC: WORK-001
Status: [APPROVED]
Role: Technical BA

## 1. Feature Description
Implementation of the Workout (Entrenamiento) CRUD core feature. The user must be able to create, edit, and access history of their workouts. This requires setting up the database schema and a robust API.

## 2. Acceptance Criteria
- [ ] Drizzle ORM configured with `Workouts` and `WorkoutExercises` tables.
- [ ] Implementation of `POST /api/workouts` matches the OpenAPI spec exactly.
- [ ] Implementation of `GET /api/workouts` retrieves historical workouts for the authenticated user only.
- [ ] Implementation of `PUT /api/workouts/{id}` and `DELETE /api/workouts/{id}`.
- [ ] Server actions or endpoints enforce authentication via Clerk.
- [ ] BDD coverage confirms proper API restrictions (e.g., users cannot edit other users' workouts).

## 3. Data Model
- `workouts`: `id`, `user_id` (foreign key to `users` or external auth id), `fecha`, `createdAt`, `updatedAt`
- `workout_exercises`: `id`, `workout_id`, `nombre`, `series`, `repeticiones`, `peso`, `createdAt`

## SECURITY REVIEW
[APPROVED_WITH_NOTES]
- **Note:** Strict namespace/schema must be used in PostgreSQL (`fawredd_gym` or similar) to isolate from existing data.
- **Note:** Migrations or changes must not drop existing non-schema data.
