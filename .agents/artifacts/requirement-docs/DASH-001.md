# REQUIREMENT DOC: DASH-001
Status: [APPROVED]
Role: Technical BA

## 1. Feature Description
Implementation of the main Dashboard. According to the original stakeholder inputs, the dashboard serves to give the user a quick glance at their performance without unnecessary visual complexity.

## 2. Acceptance Criteria
- [ ] The dashboard must retrieve the user's workouts.
- [ ] Metric 1: Count of workouts completed per week (for the current week or last 7 days).
- [ ] Metric 2: Total volume (peso * repetitions * series) aggregated across recent workouts.
- [ ] Metric 3: A minimalist list/table of the most recent workouts (e.g., last 3-5 workouts).
- [ ] The dashboard must utilize the new protected `fawredd_gym` queries.
- [ ] Uses standard `shadcn/ui` cards.

## SECURITY REVIEW
[APPROVED]
- **Note:** Aggregations must be calculated utilizing parameterized Drizzle features or `sql` tagged templates safely bound to prevent injection. Ensure queries are strictly filtered by authenticated `user_id`.
