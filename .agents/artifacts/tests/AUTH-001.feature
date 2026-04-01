Feature: AUTH-001 - Authentication and User Setup
  As a User of the Fawredd Gym Training Assistant
  I want to be able to sign up and sign in using a secure authentication flow
  So that my workout data is protected and personalized to my profile

  Scenario: User signs up successfully
    Given I navigate to the "/sign-up" page
    When I enter valid registration details in the Clerk form
    Then I should be redirected to the "/dashboard" page
    And my user profile should be synchronized with the PostgreSQL database on the first visit

  Scenario: Protected routes redirect to sign in
    Given I am not authenticated
    When I attempt to visit "/dashboard" or "/entrenamientos"
    Then I should be redirected to the "/sign-in" page

  Scenario: User DB schema has required fields
    Given the User table explicitly specifies "id", "externalAuthId", "nombre", etc.
    When Drizzle processes the schema
    Then there should be no validation errors during SQL generation
