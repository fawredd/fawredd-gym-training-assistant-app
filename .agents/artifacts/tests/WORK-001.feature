Feature: WORK-001 - Workout CRUD Operations
  As a Gym User
  I want to create, read, update, and delete my workout logs
  So that I can effectively track my progress using the app

  Background:
    Given I am authenticated with Clerk
    And my `user` record exists in the `fawredd_gym` PostgreSQL schema

  Scenario: Creating a new workout session
    Given I am on the `/entrenamientos` page
    When I submit the WorkoutForm with valid date and exercises
    Then a `POST` request is sent to `/api/workouts`
    And a new `workout` and `workout_exercises` are persisted in the isolated database namespace
    And the UI updates to show the new workout in the history list

  Scenario: Viewing workout history
    Given I navigate to `/entrenamientos`
    When the server component executes the authorization and DB query
    Then I should only see workouts where `user_id` matches my Clerk Auth ID
    And I cannot see other users' data

  Scenario: Endpoint security isolation
    Given another user attempts to send a `PUT` or `DELETE` to `/api/workouts/{my_workout_id}`
    When the API route verifies the target workout's `userId` against the authenticated session
    Then the action is denied with a 403 Forbidden status
