Feature: DASH-001 - Dashboard Views and Aggregations
  As a Gym User
  I want to view my workout summaries on the dashboard
  So that I can quickly track my progress over the last week and see total volume

  Background:
    Given I am authenticated with Clerk
    And my `user` record exists in the `fawredd_gym` PostgreSQL schema

  Scenario: Dashboard aggregates recent activity
    Given I have navigated to the "/dashboard" route
    When the server component fetches the workout history
    Then the "Entrenamientos 7 días" metric should count all workouts from the past 7 days matching my user ID
    And the "Volumen Total" metric should show the sum of (peso * reps * series) for all my logged exercises
    And I should see a list of my 3 most recent workouts

  Scenario: Dashboard data namespace constraints
    Given another user's workout data is stored in the database
    When my dashboard queries are generated via Drizzle ORM
    Then the SQL template MUST restrict sums and counts exclusively to my `user_id`
    And no other schema data should leak into my metrics
