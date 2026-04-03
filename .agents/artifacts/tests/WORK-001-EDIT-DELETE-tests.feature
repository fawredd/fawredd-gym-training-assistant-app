Feature: WORK-001 Update & Delete - Workout Modification
  As a Gym User
  I want to edit and delete my existing workouts
  So that I can correct mistakes and clean up past entries

  Background:
    Given I am authenticated with Clerk
    And my `user` record exists in `fawredd_gym` PostgreSQL schema
    And my user has ID matching the session token
    And a workout exists in my history from 2026-03-20 with ID "w_001"
    And the workout "w_001" contains exercises:
      | Exercise Name | Series | Reps | Weight |
      | Bench Press | 3 | 10 | 80 |
      | Squats | 4 | 8 | 100 |

  # ===== EDIT WORKOUT (PUT /api/workouts/{id}) — P1 CRITICAL GAP =====
  
  Scenario: Update workout date and exercises successfully
    Given I navigate to "/entrenamientos"
    And I locate the workout from 2026-03-20
    When I click "Edit" on that workout
    Then I navigate to "/entrenamientos/w_001/edit"
    And the form pre-populates with:
      | Field | Value |
      | Date | 2026-03-20 |
      | Exercise 1 | Bench Press, 3 series, 10 reps, 80kg |
      | Exercise 2 | Squats, 4 series, 8 reps, 100kg |
    When I change Exercise 1 weight to 90kg
    And I change the date to 2026-03-21
    And I click "Guardar"
    Then a PUT request is sent to "/api/workouts/w_001" with:
      ```json
      {
        "fecha": "2026-03-21",
        "exercises": [
          { "nombre": "Bench Press", "series": 3, "repeticiones": 10, "peso": 90 },
          { "nombre": "Squats", "series": 4, "repeticiones": 8, "peso": 100 }
        ]
      }
      ```
    And the server responds 200 OK
    And the database record is updated:
      | Column | New Value |
      | fecha | 2026-03-21 |
      | exercises[0].peso | 90 |
    And I am redirected to "/dashboard" or "/entrenamientos"
    And the updated workout now appears under 2026-03-21 in the calendar

  Scenario: Add exercise to existing workout during edit
    Given I am on the edit form for workout "w_001"
    When I click "Agregar ejercicio"
    And I fill in the new exercise:
      | Field | Value |
      | Name | Barbell Row |
      | Series | 4 |
      | Reps | 6 |
      | Weight | 110 |
    And I click "Guardar"
    Then the PUT request includes all exercises (original + new):
      | Exercise | Series | Reps | Weight |
      | Bench Press | 3 | 10 | 90 |
      | Squats | 4 | 8 | 100 |
      | Barbell Row | 4 | 6 | 110 |
    And the server persists all three exercises
    And the database query `SELECT * FROM workout_exercises WHERE workout_id = 'w_001'` returns 3 rows

  Scenario: Remove exercise from workout during edit
    Given I am editing workout "w_001" which has 2 exercises
    When I click the delete icon next to "Squats"
    And I click "Guardar"
    Then the PUT request includes only remaining exercises:
      ```json
      {
        "exercises": [
          { "nombre": "Bench Press", "series": 3, "repeticiones": 10, "peso": 80 }
        ]
      }
      ```
    And the server deletes the removed `workout_exercises` row
    And the exercise is no longer in the database

  Scenario: Cannot edit another user's workout (Security — IDOR Prevention)
    Given User B has a workout with ID "w_another_user"
    And I attempt to navigate to "/entrenamientos/w_another_user/edit"
    When the page tries to load the form
    Then the server responds 403 Forbidden
    Or the page redirects to "/dashboard" with an error message
    And the error message does NOT reveal whether the ID exists
    And I cannot modify User B's workout data

  Scenario: PUT request denied if user_id mismatch
    Given another user's workout ID is "w_another_user"
    When I send a PUT request to `/api/workouts/w_another_user` with my session token
    Then the API responds 403 Forbidden
    And includes error message: "Forbidding action on workout not owned by user"
    And the workout data is NOT modified

  Scenario: Invalid date rejected on edit
    Given I am editing workout "w_001"
    When I set the date field to "not-a-date"
    And I click "Guardar"
    Then the form shows validation error: "Fecha inválida"
    And the error is displayed above the date field
    And NO PUT request is sent to the server

  Scenario: Empty exercise list rejected
    Given I am editing "w_001"
    When I remove all exercises
    And I click "Guardar"
    Then the form shows: "Debe agregar al menos un ejercicio"
    And NO PUT request is sent

  Scenario: Invalid exercise data (negative weight) rejected
    Given I am editing "w_001"
    When I change Exercise 1 weight to -10kg
    And I click "Guardar"
    Then the form shows: "Peso debe ser mayor a 0"
    And NO PUT request is sent

  # ===== DELETE WORKOUT (DELETE /api/workouts/{id}) — P1 CRITICAL GAP =====
  
  Scenario: Delete workout from workout list page
    Given I navigate to "/entrenamientos"
    And a workout from 2026-03-20 is displayed in the list
    When I click the delete icon (trash can) for that workout
    Then a confirmation dialog appears:
      | Text | "¿Eliminar este entrenamiento?" |
      | Buttons | "Cancelar", "Confirmar" |
    When I click "Confirmar"
    Then a DELETE request is sent to `/api/workouts/w_001`
    And the server responds 200 OK
    And the workout row is deleted from the database:
      ```sql
      SELECT * FROM workouts WHERE id = 'w_001' → 0 rows (deleted)
      ```
    And the UI removes the workout from the list immediately
    And the user sees a success message (optional toast)

  Scenario: Cancel delete returns to list without modification
    Given the confirmation dialog is open
    When I click "Cancelar"
    Then the dialog closes
    And NO DELETE request is sent
    And the workout remains in the list
    And the database is unchanged

  Scenario: Delete workout removes all associated exercises
    Given workout "w_001" has 4 associated `workout_exercises` rows
    When I confirm the deletion
    Then the server cascade-deletes all `workout_exercises`:
      ```sql
      SELECT * FROM workout_exercises WHERE workout_id = 'w_001' → 0 rows (all deleted)
      ```
    And the database maintains referential integrity

  Scenario: Delete workout from calendar modal
    Given the workout modal for 2026-03-20 is open
    When I click a delete button in the modal (if present)
    Then a confirmation dialog appears
    When I confirm
    Then DELETE /api/workouts/w_001 is called
    And the modal closes
    And the calendar no longer highlights 2026-03-20

  Scenario: Cannot delete another user's workout
    Given User B's workout ID is "w_another_user"
    When I send a DELETE request to `/api/workouts/w_another_user`
    Then the API responds 403 Forbidden
    And the workout is NOT deleted from the database
    And error message does NOT reveal ID existence

  Scenario: Cannot accidentally mass-delete on rapid clicking
    Given a delete dialog is open
    When user manually clicks "Confirmar" twice rapidly (within 100ms)
    Then only ONE DELETE request is sent
    And the second click is ignored or disabled
    And only one workout is deleted (not duplicated deletion)

  Scenario: Delete non-existent workout returns 404
    Given workout ID "w_invalid_id" does not exist
    When I send DELETE /api/workouts/w_invalid_id
    Then the API responds 404 Not Found
    And a user-friendly error is shown (not a crash)

  # ===== ERROR HANDLING =====
  
  Scenario: Server error (500) on update shows retry option
    Given a network error or server crash occurs during PUT
    When the request fails with 500 Internal Server Error
    Then the UI shows: "Algo salió mal. ¿Reintentar?"
    And a "Reintentar" button is available
    And clicking "Reintentar" resubmits the form data

  Scenario: Duplicate workout prevention validation
    Given a workout already exists on 2026-03-20
    When I try to create/edit another workout to the same date and time
    Then either:
      a) The form warns: "Ya existe un entrenamiento este día"
      b) Or the system allows it and returns notes in UI

  # ===== EDIT FORM USABILITY =====
  
  Scenario: Edit form has proper mobile responsiveness
    Given I am on "/entrenamientos/w_001/edit" on a 375px mobile device
    When I view the form
    Then all input fields are full-width or stacked
    And buttons are minimum 44x44px touch target
    And no horizontal scroll is required

  Scenario: Form values persist on validation error
    Given I submit an invalid form (e.g., negative weight)
    When validation fails and redisplays the form
    Then all previously entered values remain filled in
    And only invalid fields show error messages
    And the user does not lose their input

  Scenario: Pre-filled edit form values show current state
    Given a workout has: Date=2026-03-20, Bench Press (3x10x80kg), Squats (4x8x100kg)
    When I open the edit form
    Then each field displays the current/existing value clearly
    And the form gives visual indication that it is an "Edit" action (not "Create")
