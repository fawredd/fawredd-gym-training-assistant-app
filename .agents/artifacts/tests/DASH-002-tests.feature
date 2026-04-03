Feature: DASH-002 - Phase 2 Mobile-First Dashboard
  As a Gym User
  I want a mobile-optimized dashboard that shows my daily status, 
  recent workouts, and AI recommendations
  So that I can quickly understand my progress and register new workouts

  Background:
    Given I am authenticated with Clerk
    And my `user` record exists in `fawredd_gym` PostgreSQL schema
    And I have at least one workout from the past 20 days

  # ===== HEADER (Acceptance Criterion 2) =====
  
  Scenario: Header displays menu, title, and theme toggle
    Given I navigate to "/dashboard"
    Then the header contains:
      | Element | Type |
      | Menu button | Icon button |
      | App title | Text "Fawredd" (centered) |
      | Theme toggle | Toggle button |

  Scenario: Theme toggle switches between light and dark mode
    Given I am on "/dashboard"
    And the current theme is "light"
    When I click the theme toggle button
    Then the theme switches to "dark"
    And the color scheme updates immediately
    And the preference persists on page reload

  # ===== CTA (Acceptance Criterion 3 — CRITICAL) =====
  
  Scenario: CTA button visible above fold on mobile (375px)
    Given I am on "/dashboard" with viewport 375x667 (mobile)
    When I load the page
    Then the "Registrar entrenamiento" button is visible without scrolling
    And the button has minimum 44x44px touch target

  Scenario: CTA button visible above fold on tablet (812px)
    Given I am on "/dashboard" with viewport 812x1024 (tablet)
    When I load the page
    Then the "Registrar entrenamiento" button is visible without scrolling

  Scenario: CTA button navigates to workout creation flow
    Given I am on "/dashboard"
    When I click "Registrar entrenamiento"
    Then I navigate to the workout creation form
    And the form allows me to add exercises and save

  # ===== ESTADO DEL DÍA (Acceptance Criterion 4 — CRITICAL) =====
  
  Scenario: Daily status shows "Hoy sí entrenaste" when workout exists
    Given I have logged a workout today (date = today)
    When I navigate to "/dashboard"
    Then the DailyStatus block displays: "Hoy sí entrenaste"
    And an AI snippet from the latest "ayuda memoria" is shown on one line
    And the block is clearly readable (not collapsed/hidden)

  Scenario: Daily status shows incentive when no workout today
    Given I have NOT logged a workout for today (but have previous workouts)
    When I navigate to "/dashboard"
    Then the DailyStatus block shows: "No registraste entrenamiento hoy"
    And an action message is displayed (e.g., "¿Preparado para hoy?")
    And a link/CTA to create workout is present

  Scenario: Daily status shows AI memory line when available
    Given the last generated AI memory is: "Mantén consistencia en 3 entrenamientos por semana"
    When I view DailyStatus
    Then the memory text is displayed in full and readable
    And the text does NOT regenerate (uses cached DB value)

  Scenario: Daily status empty AI case
    Given no AI memory has been generated yet
    When I view DailyStatus
    Then the block does NOT crash
    And a placeholder message appears (e.g., "Sin recomendaciones aún")

  # ===== CALENDARIO (Acceptance Criterion 5 — CRITICAL) =====
  
  Scenario: Calendar displays 20-day grid with today highlighted
    Given I navigate to "/dashboard"
    When I view the CALENDARIO DE ENTRENAMIENTOS section
    Then a grid of exactly 20 days is displayed
    And today's date is highlighted with a distinct style
    And each day shows the date (e.g., "28", "27", "26")

  Scenario: Calendar highlights days with logged workouts
    Given I have workouts on the following dates: 2026-03-28, 2026-03-25, 2026-03-20
    When I view the calendar
    Then those three days are visually distinct from days without workouts
    And the highlighting is readable in both light and dark mode

  Scenario: Calendar days are clickable buttons with proper touch targets
    Given the calendar is displayed
    When I tap/click a day with a workout
    Then the click registers (tap target ≥ 44px²)
    And no unintended adjacent day is clicked
    When I tap a day WITHOUT a workout
    Then the button is still clickable (does not have empty `onClick`)
    And clicking shows appropriate feedback (e.g., "Sin datos", modal with "Crear aquí")

  Scenario: Calendar click on empty day shows "Sin ejercicios registrados" with create option (CRITICAL — F0)
    Given I navigate to "/dashboard"
    And 2026-03-22 has NO logged workouts
    When I click on 2026-03-22 in the calendar
    Then a modal appears with message: "Sin ejercicios registrados"
    And a button "Crear entrenamiento para esta fecha" is displayed
    When I click "Crear entrenamiento para esta fecha"
    Then I navigate to "/entrenamientos/new?date=2026-03-22"
    And the date field is pre-filled with "2026-03-22"
    And I can add exercises and save a new workout
    And the new workout appears in the calendar

  Scenario: Calendar modal opens showing workout exercises (CRITICAL — F3)
    Given I click on 2026-03-28 which has a workout with these exercises:
      | Ejercicio | Series | Reps | Peso |
      | Bench Press | 3 | 10 | 80kg |
      | Squats | 4 | 8 | 100kg |
    When the modal opens
    Then a table/list displays all exercises with their details
    And the modal has clear title "Entrenamiento - 2026-03-28"

  Scenario: Calendar modal "Editar" button navigates to edit form (CRITICAL — F1)
    Given the workout modal is open
    When I click the "Editar" button
    Then I navigate to "/entrenamientos/[workout_id]/edit"
    And the edit form loads with pre-populated data:
      | Field | Value |
      | Date | 2026-03-28 |
      | Exercise 1 Name | Bench Press |
      | Exercise 1 Sets | 3 |
      | Exercise 1 Reps | 10 |
      | Exercise 1 Weight | 80 |
    And I can modify the exercises
    And clicking "Guardar" sends a PUT request and updates the dashboard

  Scenario: Calendar modal "Usar como base" creates new workout with template (CRITICAL — F2)
    Given the workout modal is open for 2026-03-28's workout
    When I click "Usar como base"
    Then I navigate to "/entrenamientos/new?baseId=[workout_id]"
    And the new workout form appears with exercises pre-populated from 2026-03-28
    And the date field is set to today
    And I can modify exercises before saving
    And clicking "Guardar" creates a NEW workout without modifying the base

  Scenario: Calendar modal "Eliminar entrenamiento" removes workout (CRITICAL — F3)
    Given the workout modal is open
    When I click "Eliminar entrenamiento"
    Then a confirmation dialog appears: "¿Eliminar este entrenamiento?"
    And buttons "Cancelar" and "Confirmar" are presented
    When I click "Confirmar"
    Then a DELETE request is sent to "/api/workouts/[workout_id]"
    And the server responds 200 OK
    And the workout is removed from the database
    And the modal closes
    And the calendar no longer highlights that date

  Scenario: Calendar modal delete — cancel action preserves workout
    Given the workout modal is open
    And the delete confirmation dialog is displayed
    When I click "Cancelar" button
    Then the dialog closes
    And the modal remains open
    And the workout is NOT deleted
    And the calendar still highlights that date

  Scenario: Calendar modal delete — error handling (network error)
    Given the workout modal is open
    And I click "Eliminar entrenamiento" → "Confirmar"
    When the DELETE request to "/api/workouts/[workout_id]" returns 500 Internal Server Error
    Then an error message appears: "No se pudo eliminar el entrenamiento. Intenta de nuevo."
    And the modal remains open
    And the workout is NOT removed from the database
    And the user can retry the delete operation

  Scenario: Calendar modal delete — error handling (workout not found)
    Given the workout modal is open for workout ID "invalid-id"
    When I click "Eliminar entrenamiento" → "Confirmar"
    And the DELETE request returns 404 Not Found
    Then an error message appears: "El entrenamiento ya no existe"
    And the modal closes
    And the calendar refreshes to remove the stale entry

  Scenario: Empty day modal behavior
    Given I am on "/dashboard"
    And the calendar is visible
    When I click on a day without workouts
    Then a modal appears with the message "Sin ejercicios registrados"
    And the modal contains:
      | Action              | Type         |
      | Nuevo Entrenamiento | Link button  |
      | Cerrar              | Close button |
    When I click "Nuevo Entrenamiento"
    Then I am redirected to "/entrenamientos/new?date=YYYY-MM-DD"
    When I click "Cerrar"
    Then the modal disappears

  # ===== RESUMEN SEMANAL (Acceptance Criterion 6) =====
  
  Scenario: Weekly summary table shows muscle groups ranked by frequency
    Given I have workouts from the last 7 days:
      | Date | Exercises |
      | 2026-03-28 | Bench Press, Squats (Pecho, Piernas) |
      | 2026-03-27 | Bench Press (Pecho) |
      | 2026-03-26 | Lat Pulldown (Espalda) |
      | 2026-03-25 | Bench Press, Lat Pulldown (Pecho, Espalda) |
    When I scroll to RESUMEN SEMANAL
    Then a table displays muscle groups in descending order by frequency:
      | Grupo Muscular | Días |
      | Pecho | 3 |
      | Espalda | 2 |
      | Piernas | 1 |

  Scenario: Weekly summary shows top muscle insight
    Given the weekly data loaded above
    When I view the insights section
    Then I see: "Más trabajado: Pecho (3 días)"
    And this is displayed as plain text (not collapsed/hidden)

  Scenario: Weekly summary shows bottom muscle insight
    Given the weekly data
    When I view the insights
    Then I see: "Menos trabajado: Piernas (1 día)"

  Scenario: Weekly summary shows training frequency
    Given 5 days in the last 7 had at least one workout
    When I view the insights
    Then I see: "Entrenaste: 5/7 días"

  Scenario: Weekly summary edge case: all muscles equal frequency
    Given all muscle groups were trained exactly 2 times last week
    When I view the insights
    Then the table displays all muscle groups
    And the "Más trabajado" and "Menos trabajado" insights both show as tied
    And the page does NOT crash

  Scenario: Weekly summary edge case: fewer than 7 days of data
    Given I have only 3 workouts in the past 7 days
    When I view the summary
    Then the table shows only muscle groups that were trained
    And the frequency total shows correctly (e.g., "Entrenaste: 3/7 días")
    And null/undefined values are handled gracefully

  # ===== BLOQUE AI (Acceptance Criterion 7 — CRITICAL) =====
  
  Scenario: AI Insight block displays latest memory
    Given I have at least one AI-generated memory in the database
    And the latest memory is: "Aumenta el volumen total en un 10% incrementando series"
    When I navigate to "/dashboard"
    Then the AIInsight block is visible
    And the memory text is displayed in full
    And the block has visually distinct styling (background color, border)
    And text is readable in both light and dark mode

  Scenario: AI Insight does NOT regenerate on each page load
    Given an AI memory exists in the database
    When I navigate to "/dashboard" multiple times
    Then the same memory is shown each time
    And no new API calls to `/api/ai` are made
    And the server does NOT waste tokens regenerating

  Scenario: AI Insight handles empty memory case
    Given no AI memory has been generated yet
    When I navigate to "/dashboard"
    Then the AIInsight block is still visible
    And it shows a placeholder message (e.g., "Sin recomendaciones aún")
    And the page does NOT crash or show an error

  # ===== MOBILE-FIRST RESPONSIVE (Acceptance Criterion 8) =====
  
  Scenario Outline: Dashboard layout adapts to mobile viewports (CRITICAL — G1-5/G1-6)
    Given I am on "/dashboard"
    When my viewport is <width>x<height>
    Then no horizontal scroll is required
    And all elements (header, CTA, calendar, sections) fit vertically
    And text font size is minimum 12px
    And touch targets (buttons) are minimum 44x44 pixels
    And the calendar grid shows all 20 days without truncation

    Examples:
      | width | height | Device |
      | 375   | 667    | iPhone SE |
      | 390   | 844    | iPhone 12/13 |
      | 412   | 915    | Pixel 6 |
      | 768   | 1024   | iPad Mini |

  Scenario: Dark mode rendering is correct across all elements (CRITICAL — F4)
    Given theme is set to dark mode
    When I navigate to "/dashboard"
    Then all text elements have sufficient contrast (WCAG AA minimum 4.5:1)
    And no hardcoded white (`bg-white`, `text-white`) ruins the dark theme
    And the calendar grid is legible (not washed out)
    And the WeeklySummary table has proper contrast
    And the AIInsight block is visually distinct in dark mode
    And the page uses theme tokens (not hardcoded colors) consistently

  Scenario: Light mode rendering is correct
    Given theme is set to light mode
    When I navigate to "/dashboard"
    Then all text has proper contrast
    And the color scheme is consistent
    And no transparency/opacity breaks readability

  # ===== ENTRENAMIENTOS LIST PAGE (Acceptance Criterion 5 — Delete from list) =====
  
  Scenario: Entrenamientos list displays all user workouts
    Given I have 5 workouts in the database:
      | ID | Date | Exercises |
      | 1 | 2026-03-28 | Bench Press, Squats |
      | 2 | 2026-03-27 | Lat Pulldown, Rows |
      | 3 | 2026-03-26 | Deadlift, Bench Press |
      | 4 | 2026-03-25 | Bicep Curls |
      | 5 | 2026-03-24 | Leg Press |
    When I navigate to "/entrenamientos"
    Then all 5 workouts are displayed in the list
    And each workout shows the date formatted as readable text
    And each workout displays a preview of exercises
    And each workout row has action buttons (Edit, Clone, Delete)

  Scenario: Entrenamientos list — delete workout button initiates deletion
    Given I am on "/entrenamientos" with a workout displayed:
      | ID | Date | Exercises |
      | 42 | 2026-03-28 | Bench Press (3x10) |
    When I click the "Eliminar" button on that workout row
    Then a confirmation dialog appears: "¿Eliminar este entrenamiento?"
    And the dialog shows the workout date: "2026-03-28"
    And buttons "Cancelar" and "Confirmar" are presented

  Scenario: Entrenamientos list — delete confirms and removes workout (CRITICAL — F3.b)
    Given I am on "/entrenamientos"
    And the delete confirmation dialog is displayed for workout ID 42
    When I click "Confirmar"
    Then a DELETE request is sent to "/api/workouts/42"
    And the server responds 200 OK
    And the workout is removed from the database
    And the dialog closes
    And the list refreshes
    And the deleted workout no longer appears in the list
    And a success message appears: "Entrenamiento eliminado"

  Scenario: Entrenamientos list — delete cancel preserves workout
    Given I am on "/entrenamientos"
    And the delete confirmation dialog is displayed for workout ID 42
    When I click "Cancelar" button
    Then the dialog closes
    And the list remains unchanged
    And the workout ID 42 is still visible in the list
    And the workout is NOT deleted

  Scenario: Entrenamientos list — delete propagates to dashboard calendar
    Given I am on "/entrenamientos" with workout ID 42 (date: 2026-03-28)
    When I delete workout ID 42
    Then the DELETE request succeeds
    And I navigate back to "/dashboard"
    Then 2026-03-28 is no longer highlighted in the calendar
    And the calendar correctly reflects the deletion

  Scenario: Entrenamientos list — delete with network error
    Given I am on "/entrenamientos"
    And the delete confirmation dialog is displayed for workout ID 42
    When I click "Confirmar"
    And the DELETE request returns 500 Internal Server Error
    Then an error message appears: "Error al eliminar. Intenta de nuevo."
    And the dialog closes
    And the list still displays workout ID 42
    And the user can attempt deletion again

  Scenario: Entrenamientos list — delete with 404 (workout already deleted)
    Given I am on "/entrenamientos"
    And the delete confirmation dialog is displayed for workout ID "missing-id"
    When I click "Confirmar"
    And the DELETE request returns 404 Not Found
    Then an error message appears: "El entrenamiento ya no existe"
    And the list refreshes
    And any stale entries are removed
