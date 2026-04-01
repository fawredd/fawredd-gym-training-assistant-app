# REQUIREMENT DOC: WORK-002
Status: [PENDING]
Role: Technical BA

## 1. Feature Description
AI ETL Workout Loader. The system enables users to input raw, unstructured text describing multiple workouts (e.g. "On monday I did... then yesterday I did planks..."). The system extracts exercises, logic, and dates, and bulk inserts them into the DB.

## 2. Acceptance Criteria
- [ ] Drizzle schema handles Isometric exercises (e.g. planks). `peso` and `repeticiones` must default to 0. Add `duracion_segundos`.
- [ ] Implement `POST /api/workouts/etl` catching a string prompt and an explicit reference `date`.
- [ ] Mapped Workouts MUST enforce a valid `date`. The AI parser must reject mapping or request clarification if dates cannot be inferred.
- [ ] Use `@openrouter/ai-sdk-provider` and structured output (`generateObject` with Zod) to parse dates and exercises.
- [ ] Server validates `userId`.
- [ ] Frontend must provide a Magic Textarea option next to the manual builder.

## SECURITY REVIEW
[PENDING] - Awaiting review on rate limits to prevent prompt-bombing.
