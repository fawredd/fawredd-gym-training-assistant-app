Feature: PH3 - Objective-Driven Training System
  As a Gym User
  I want to define a personal training objective and have the AI system 
  continuously evolve my training guidance toward that objective
  So that I can work toward meaningful long-term goals with personalized coaching

  Background:
    Given I am authenticated with Clerk
    And my `user` record exists with id "<user_id>" in `fawredd_gym` PostgreSQL schema
    And no training objective exists for my user
    And Redis cache is cleared for user "<user_id>"

  # ===== ACCEPTANCE CRITERION 1: OBJECTIVE MANAGEMENT - ADD =====

  Scenario: User adds a training objective from empty state
    Given I navigate to "/dashboard"
    And the "Objetivo actual" block shows empty state
    And the CTA says "Agregar objetivo"
    When I click "Agregar objetivo"
    Then a modal opens titled "Crear Objetivo"
    And the modal contains a text input placeholder: "e.g., Increase squat to 120kg"
    And there is a "Guardar objetivo" button

  Scenario: User successfully adds objective via dashboard modal
    Given I am on "/dashboard" with empty objective state
    When I click "Agregar objetivo"
    And I enter "Run 5km without stopping" in the modal input
    And I click "Guardar objetivo"
    Then the modal closes
    And the "Objetivo actual" block is now visible
    And it displays the text "Run 5km without stopping"
    And an "Editar" button appears next to the objective

  Scenario: Objective persists in database after creation
    Given I add objective "Increase squat to 120kg"
    When I call GET /api/objectives (authenticated)
    Then the response contains:
      | Field | Value |
      | content | "Increase squat to 120kg" |
      | userId | "<user_id>" |
      | updatedAt | <timestamp_today> |

  Scenario: User cannot add empty or whitespace-only objective
    Given I am on the "Crear Objetivo" modal
    When I enter "   " (whitespace only) in the input
    And I click "Guardar objetivo"
    Then the button remains disabled
    Or an error message shows: "Objective cannot be empty"

  # ===== ACCEPTANCE CRITERION 1: OBJECTIVE MANAGEMENT - EDIT =====

  Scenario: User edits existing objective from dashboard
    Given I have an existing objective: "Run 5km without stopping"
    When I click "Editar" on the "Objetivo actual" block
    Then a modal opens titled "Editar Objetivo"
    And the text input is pre-filled with: "Run 5km without stopping"
    And a "Guardar cambios" button is visible

  Scenario: User updates objective text successfully
    Given I have objective: "Lose 5kg in 3 months"
    When I click "Editar"
    And I clear the input and enter "Lose 8kg by end of summer"
    And I click "Guardar cambios"
    Then the modal closes
    And the dashboard block displays: "Lose 8kg by end of summer"
    And the database is updated with `updatedAt` timestamp

  Scenario: Objective update includes updated timestamp
    Given I have objective created 30 days ago: "Original objective"
    When I update it to "Updated objective"
    And I call GET /api/objectives
    Then the response includes:
      | Field | Condition |
      | content | "Updated objective" |
      | updatedAt | <current_timestamp> |
      | createdAt | <30_days_ago> |

  # ===== ACCEPTANCE CRITERION 2: DASHBOARD CHANGES - DISPLAY =====

  Scenario: Objective block appears at TOP of dashboard (above header)
    Given I navigate to "/dashboard"
    And I have an active objective: "Increase squat to 120kg"
    When the page loads
    Then the "Objetivo actual" block is the first component rendered
    And all other dashboard blocks appear below it
    And the layout does not shift when objective loads

  Scenario: Objective block is mobile-responsive (375px viewport)
    Given I am on "/dashboard" with viewport 375x667 (mobile)
    And I have objective: "Train consistently 3x per week"
    Then the objective block is visible without scrolling
    And the text is fully readable (no truncation)
    And the "Editar" button is tappable (44x44px minimum)
    And the block width is 100% of viewport minus padding

  Scenario: Empty state CTA is prominent on mobile
    Given I am on "/dashboard" with viewport 375x667 (mobile)
    And I have no objective
    When the page loads
    Then the "Agregar objetivo" CTA button is visible above fold
    And the button text is clear and actionable
    And there is sufficient spacing for touch accuracy

  # ===== ACCEPTANCE CRITERION 3: AI CONTEXT EXTENSION - LOOP INTEGRATION =====

  Scenario: AI context includes training objective when present
    Given I have objective: "Increase squat to 120kg"
    And I submit a workout: "Squat 5x5, 100kg"
    When the backend processes the AI recommendation request
    Then the AI context payload includes:
      | Field | Presence |
      | trainingObjective.content | "Increase squat to 120kg" |
      | lastTrainings | Array of exercises |
      | userGoal | "Fuerza" |
      | previousTrainingState | Object or null |

  Scenario: AI context does NOT include objective when empty
    Given I have no training objective
    And I submit a workout: "Cardio 20min"
    When the backend processes the AI recommendation request
    Then the AI context payload includes:
      | Field | Value |
      | trainingObjective | null |
      | lastTrainings | Array |
      | userGoal | "Fuerza" |

  Scenario: AI recommendation response includes new training state
    Given I have objective: "Run 5km without stopping"
    And I submit workout: "Run 3km in 20min"
    When the backend calls the AI service
    Then the AI response is parsed and includes:
      | Field | Type |
      | guidance | String |
      | trainingState.progress | String |
      | trainingState.observations | String |
      | trainingState.nextFocusAreas | String |
      | trainingState.coachingDirection | String |

  # ===== ACCEPTANCE CRITERION 4: TRAINING STATE EVOLUTION =====

  Scenario: Training state is created and persisted after AI response
    Given I have objective: "Lose 5kg in 3 months"
    And I submit workout: "Full body 45min, 8 exercises"
    When AI generates a recommendation
    Then a new trainingState record is created:
      | Field | Constraint |
      | userId | My user ID |
      | content | Contains progress, observations, focus areas |
      | createdAt | Current timestamp |
      | id | Unique UUID |

  Scenario: Previous training state is included in next AI context
    Given I have existing trainingState: 
      """
      {
        "progress": "50% toward squat goal",
        "observations": "Great form on last set",
        "nextFocusAreas": "increase weight by 5%",
        "coachingDirection": "maintain current intensity"
      }
      """
    When I submit the next workout: "Squat 5x5, 105kg"
    And the backend gathers AI context
    Then the context includes the previousTrainingState
    And the AI considers this historical state in its response

  Scenario: Training state evolves across multiple interactions
    Given Interaction 1: I submit "Bench press 5x5, 80kg"
    And AI generates state_1: "progress: 0%, focus: increase reps"
    When Interaction 2: I submit "Bench press 5x5, 85kg"
    Then AI context includes state_1
    And AI generates state_2 that shows progression (e.g., "progress: 25%")
    And the coaching direction in state_2 builds upon state_1

  Scenario: Multiple sessions contribute to state continuity
    Given I have objective: "Increase squat to 120kg"
    And Session 1 (Day 1): trainingState_1 created
    And Session 2 (Day 3): trainingState_2 created (includes context from all prev)
    And Session 3 (Day 5): trainingState_3 created (context from all prev)
    When I query GET /api/objectives/state
    Then the response shows all three states in chronological order
    And each state builds contextually upon the previous

  # ===== ACCEPTANCE CRITERION 5: CRITICAL FLOW - FULL LOOP =====

  Scenario: Complete workflow - Add objective → Submit workout → AI evolves state
    Given I navigate to "/dashboard"
    And I have no objective
    When I click "Agregar objetivo"
    And I enter "Lose 5kg in 3 months"
    And I click "Guardar objetivo"
    Then the objective block displays "Lose 5kg in 3 months"
    
    When I click "Registrar entrenamiento"
    And I submit workout: "Cardio + Weights 60min"
    Then the AI recommendation is generated
    And the response includes coaching guidance aligned with my objective
    And a trainingState is persisted to the database

    When I return to "/dashboard"
    Then the objective is still visible
    And the dashboard shows the latest AI response
    And the trainingState is accessible via API

  Scenario: Edit objective mid-journey reflects in next AI response
    Given I have objective: "Run 5km"
    And I have completed 3 workouts with trainingStates
    When I edit objective to: "Run 5km + Strength train"
    And I submit next workout: "Run 3km + Bench press"
    Then the AI context includes the new objective
    And the AI recommendation reflects both running and strength training
    And the new trainingState shows adjusted coaching direction

  # ===== EDGE CASES & ERROR SCENARIOS =====

  Scenario: Objective edit is idempotent (no duplicate states created)
    Given I have objective: "Original"
    When I click "Editar" but change nothing and save
    Then no extra database record is created
    And the updatedAt timestamp changes (to reflect edit attempt)
    Or no timestamp change if content is identical

  Scenario: User with no objective can still get AI recommendations
    Given I have no objective
    And I submit workout: "Squat 5x5"
    When the AI processes the request
    Then the recommendation is generated successfully
    And it is based on lastTrainings + userGoal (fallback behavior)
    And no error occurs

  Scenario: Objective longer than 500 characters is truncated/rejected
    Given I am on the "Crear Objetivo" modal
    When I paste a very long string (>500 chars)
    And I click "Guardar objetivo"
    Then one of the following occurs:
      | Behavior |
      | Input is truncated to 500 chars |
      | Error message shown: "Max 500 characters" |
      | Submit button disabled at 500 chars |

  Scenario: Special characters in objective are sanitized
    Given I am on the "Crear Objetivo" modal
    When I enter: "Increase squat <script>alert('xss')</script> to 120kg"
    And I click "Guardar objetivo"
    Then the objective is sanitized and stored as: "Increase squat alert('xss') to 120kg"
    Or sanitization removes dangerous tags entirely
    And no XSS vulnerability occurs when rendering

  # ===== SECURITY & VALIDATION SCENARIOS =====

  Scenario: Unauthorized user cannot retrieve another user's objective
    Given I am user_A
    When I attempt GET /api/objectives for user_B
    Then the response status is 403 Forbidden
    And no objective data is leaked

  Scenario: Objective creation respects user authentication
    Given I am not authenticated
    When I call POST /api/objectives with data: "My objective"
    Then the response status is 401 Unauthorized
    And no objective is created

  Scenario: Rate limiting applied to objective CRUD operations
    Given I am authenticated
    When I create 50 objectives in 1 minute
    Then after X requests, I receive 429 Too Many Requests
    And the rate limit header shows retry-after value

  # ===== INTEGRATION TESTS =====

  Scenario: Dashboard aggregation endpoint includes training state data
    Given I have objective: "Full body strength"
    And I have 3 workouts with associated trainingStates
    When I call GET /api/dashboard/summary
    Then the response includes:
      | Field | Type |
      | currentObjective | Object |
      | lastTrainingState | Object |
      | workoutsThisWeek | Array |
      | totalVolume | Number |

  Scenario: Cache key invalidation when objective changes
    Given objective cached as key: "user_<id>_objective"
    When I update the objective
    Then the Redis key is invalidated
    And the next request fetches fresh data from DB
    And the cache is repopulated with new objective

  Scenario: Cache includes objective hash for consistency
    Given I have objective: "Lose 5kg"
    When the backend caches AI context
    Then the cache key includes: 
      | Component |
      | user_id |
      | objectiveHash (MD5 of content) |
      | timestamp_bucket |

