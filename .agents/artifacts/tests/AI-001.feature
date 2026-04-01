Feature: AI-001 - OpenRouter AI Recommendations
  As a Gym User
  I want contextual suggestions for my next session
  So that I know how to progress based on my latest workouts

  Background:
    Given I am authenticated with Clerk
    And my goal and recent history are saved in `fawredd_gym` PostgreSQL schema

  Scenario: Generating a suggestion
    Given I navigate to the "/dashboard" and click "Sugerir Entrenamiento"
    When the `POST /api/ai` endpoint is triggered
    Then my latest workouts are assembled as JSON in the prompt
    And the OpenRouter API receives the prompt via `@openrouter/ai-sdk-provider`
    And my `aiLogs` table receives a new row tracking the prompt and output
    And the Next.js API responds with the generated memory block

  Scenario: Redis Rate Limiting protection
    Given I have already generated a suggestion within the last 12 hours
    When I click "Sugerir Entrenamiento" again
    Then the `Vercel KV` layer restricts the endpoint
    And the UI displays a message: "Límite de solicitudes alcanzado"
