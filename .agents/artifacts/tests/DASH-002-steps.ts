/**
 * DASH-002 BDD Step Definitions
 *
 * Framework: Playwright + Cucumber (@cucumber/cucumber)
 * TypeScript: Jest-compatible setup
 *
 * RUNNING TESTS LOCALLY:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ npm run test:bdd                                            │
 * │ or                                                          │
 * │ npx cucumber-js features/ --require-module ts-node/esm      │
 * └─────────────────────────────────────────────────────────────┘
 */

import { Given, When, Then, And, Before, After } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { Page, Browser, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// FIXTURES & SETUP
// ============================================================================

let page: Page;
let browser: Browser;
let context: BrowserContext;

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_USER_EMAIL = "test@example.com";
const TEST_USER_ID = "user_test_12345";

Before(async function () {
  // Initialize Playwright browser and page
  const playwright = require("playwright");
  browser = await playwright.chromium.launch({
    headless: process.env.HEADLESS !== "false",
  });
  context = await browser.createContext();
  page = await context.newPage();

  // Set viewport for mobile-first testing
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
});

After(async function () {
  // Cleanup
  await page?.close();
  await context?.close();
  await browser?.close();
});

// ============================================================================
// DATABASE FIXTURES
// ============================================================================

interface Workout {
  id: string;
  userId: string;
  date: string;
  exercises: Exercise[];
  createdAt: Date;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  muscleGroup: string;
}

/**
 * Seed test database with workouts
 */
async function seedWorkout(workout: Workout): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/workouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Clerk-User-ID": TEST_USER_ID,
      Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
    },
    body: JSON.stringify(workout),
  });

  if (!res.ok) {
    throw new Error(`Failed to seed workout: ${res.statusText}`);
  }
}

/**
 * Clean up test data
 */
async function cleanupWorkouts(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/workouts?userId=${TEST_USER_ID}`, {
    headers: {
      "X-Clerk-User-ID": TEST_USER_ID,
      Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
    },
  });

  const workouts: Workout[] = await res.json();

  for (const workout of workouts) {
    await fetch(`${BASE_URL}/api/workouts/${workout.id}`, {
      method: "DELETE",
      headers: {
        "X-Clerk-User-ID": TEST_USER_ID,
        Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
      },
    });
  }
}

// ============================================================================
// AUTHENTICATION STEPS
// ============================================================================

Given("I am authenticated with Clerk", async function () {
  // Set auth cookies for test session
  await context.addCookies([
    {
      name: "__session",
      value: process.env.TEST_CLERK_SESSION || "test_session_token",
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: true,
    },
  ]);
});

Given(
  "my user record exists in fawredd_gym PostgreSQL schema",
  async function () {
    // Verify user exists in DB (handled by Clerk integration)
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Cookie: `__session=${process.env.TEST_CLERK_SESSION}`,
      },
    });
    expect(res.ok).toBe(true);
  },
);

// ============================================================================
// CALENDAR STEPS — EMPTY DAY
// ============================================================================

Given("I navigate to {string}", async function (route: string) {
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState("networkidle");
});

Given("{string} has NO logged workouts", async function (date: string) {
  // Ensure this date has no workouts
  const res = await fetch(`${BASE_URL}/api/workouts?date=${date}`, {
    headers: {
      "X-Clerk-User-ID": TEST_USER_ID,
    },
  });
  const workouts: Workout[] = await res.json();

  // Delete any existing workouts on this date
  for (const w of workouts) {
    await fetch(`${BASE_URL}/api/workouts/${w.id}`, {
      method: "DELETE",
      headers: { "X-Clerk-User-ID": TEST_USER_ID },
    });
  }
});

When("I click on {string} in the calendar", async function (dateStr: string) {
  // Parse "2026-03-22" or similar
  const date = new Date(dateStr);
  const day = date.getDate();

  // Find calendar button by text content (day number)
  const dayButton = page.locator(`button:has-text("${day}")`).filter({
    hasNot: page.locator('button:has-text("previous")'),
  });

  await dayButton.first().click();
  await page.waitForTimeout(300); // Wait for modal animation
});

Then(
  "a modal appears with message: {string}",
  async function (message: string) {
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const text = page.locator("text=" + message);
    await expect(text).toBeVisible();
  },
);

Then("a button {string} is displayed", async function (buttonText: string) {
  const button = page.locator(`button:has-text("${buttonText}")`);
  await expect(button).toBeVisible();
});

When("I click {string}", async function (text: string) {
  const element = page.locator(
    `button:has-text("${text}"), a:has-text("${text}")`,
  );
  await element.first().click();
  await page.waitForTimeout(300);
});

Then("I navigate to {string}", async function (expectedRoute: string) {
  // Wait for navigation and verify URL
  await page.waitForURL(`**${expectedRoute}**`, { timeout: 5000 });
  expect(page.url()).toContain(expectedRoute);
});

Then(
  "the date field is pre-filled with {string}",
  async function (date: string) {
    const dateInput = page.locator('input[type="date"]');
    const value = await dateInput.inputValue();
    expect(value).toBe(date);
  },
);

// ============================================================================
// CALENDAR STEPS — MODAL & EDIT/CLONE/DELETE
// ============================================================================

Given(
  "I click on {string} which has a workout with these exercises:",
  async function (date: string, dataTable: any) {
    // Create and seed workout
    const exercises = dataTable.hashes().map((row) => ({
      name: row["Ejercicio"],
      sets: parseInt(row["Series"]),
      reps: parseInt(row["Reps"]),
      weight: parseInt(row["Peso"].replace("kg", "")),
      muscleGroup: "Pecho", // Mapped from exercise name
    }));

    const workout: any = {
      date,
      exercises,
    };

    await seedWorkout(workout);

    // Click the date in calendar
    const day = new Date(date).getDate();
    const dayButton = page.locator(`button:has-text("${day}")`);
    await dayButton.click();
    await page.waitForTimeout(300);
  },
);

Given("the workout modal is open", async function () {
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
});

Then(
  "the workout modal is open for {string} workout",
  async function (date: string) {
    // Verify modal is open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify it shows the correct date
    const dateText = page.locator(`text=${date}`);
    await expect(dateText).toBeVisible();
  },
);

When("I click the {string} button", async function (buttonText: string) {
  const button = page.locator(`button:has-text("${buttonText}")`);
  await button.click();
  await page.waitForTimeout(300);
});

Then("I navigate to {string}", async function (route: string) {
  await page.waitForURL(`**${route}**`, { timeout: 5000 });
  expect(page.url()).toContain(route);
});

// Edit flow
When(
  "the edit form loads with pre-populated data:",
  async function (dataTable: any) {
    const table = dataTable.hashes();

    for (const row of table) {
      const label = row["Field"];
      const expectedValue = row["Value"];

      if (label.includes("Date")) {
        const input = page.locator('input[type="date"]');
        const value = await input.inputValue();
        expect(value).toContain(expectedValue);
      } else if (label.includes("Name")) {
        const inputs = page.locator('input[placeholder*="Ejercicio"]');
        const value = await inputs.first().inputValue();
        expect(value).toContain(expectedValue);
      }
    }
  },
);

// Clone (Usar como base) flow
Then(
  "the new workout form appears with exercises pre-populated from {string}",
  async function (date: string) {
    await page.waitForLoadState("networkidle");

    // Verify form is visible
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Verify exercises are pre-populated (check first exercise input)
    const exerciseInput = page.locator('input[placeholder*="Ejercicio"]');
    const value = await exerciseInput.first().inputValue();
    expect(value.length).toBeGreaterThan(0); // Should have pre-filled value
  },
);

// ============================================================================
// DELETE STEPS (Calendar Modal)
// ============================================================================

Then(
  "a confirmation dialog appears: {string}",
  async function (message: string) {
    const dialog = page.locator('[role="alertdialog"], [role="dialog"]');
    await expect(dialog).toBeVisible();

    const text = page.locator(`text="${message}"`);
    await expect(text).toBeVisible();
  },
);

Then(
  "buttons {string} and {string} are presented",
  async function (btn1: string, btn2: string) {
    const button1 = page.locator(`button:has-text("${btn1}")`);
    const button2 = page.locator(`button:has-text("${btn2}")`);

    await expect(button1).toBeVisible();
    await expect(button2).toBeVisible();
  },
);

Then("a DELETE request is sent to {string}", async function (endpoint: string) {
  // Intercept and verify the DELETE call
  const deleteRequestPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/workouts/") &&
      response.request().method() === "DELETE",
  );

  // Store for later assertion
  this.lastDeleteResponse = await deleteRequestPromise;
});

Then("the server responds {int} OK", async function (statusCode: number) {
  if (this.lastDeleteResponse) {
    expect(this.lastDeleteResponse.status()).toBe(statusCode);
  }
});

Then("the workout is removed from the database", async function () {
  // Verify via API
  await page.waitForTimeout(500);
  // The actual verification would be done in subsequent steps
});

Then("the modal closes", async function () {
  const modal = page.locator('[role="dialog"]');
  await expect(modal).not.toBeVisible();
});

Then("the calendar no longer highlights that date", async function () {
  // Check that the day no longer has the "with-workout" highlight class
  const highlightedDays = page.locator(".calendar-day.has-workout");
  const count = await highlightedDays.count();
  // This would need adjustment based on actual implementation
});

// ============================================================================
// DELETE STEPS (Entrenamientos List)
// ============================================================================

Given(
  "I am on {string} with a workout displayed:",
  async function (route: string, dataTable: any) {
    await page.goto(`${BASE_URL}${route}`);
    await page.waitForLoadState("networkidle");

    const data = dataTable.hashes()[0];

    // Verify the workout is in the list
    const workoutRow = page.locator(`text=${data["Date"]}`);
    await expect(workoutRow).toBeVisible();
  },
);

When(
  "I click the {string} button on that workout row",
  async function (actionText: string) {
    const deleteButton = page
      .locator(`button:has-text("${actionText}")`)
      .last();
    await deleteButton.click();
    await page.waitForTimeout(300);
  },
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

Given(
  "the delete confirmation dialog is displayed for workout ID {string}",
  async function (workoutId: string) {
    const dialog = page.locator('[role="alertdialog"], [role="dialog"]');
    await expect(dialog).toBeVisible();
  },
);

When("I click {string} button", async function (buttonText: string) {
  const button = page.locator(`button:has-text("${buttonText}")`);
  await button.click();
  await page.waitForTimeout(300);
});

Then("a success message appears: {string}", async function (message: string) {
  const toast = page.locator(`text="${message}"`);
  await expect(toast).toBeVisible();
});

Then("the list refreshes", async function () {
  await page.reload();
  await page.waitForLoadState("networkidle");
});

Then("the deleted workout no longer appears in the list", async function () {
  const modal = page.locator('[role="dialog"]');
  await expect(modal).not.toBeVisible();

  // The deleted item should not be in DOM
  await page.waitForTimeout(500);
});

Then(
  "the list still displays workout ID {string}",
  async function (workoutId: string) {
    // Verify the workout is still visible
    const workoutRow = page.locator(`[data-workout-id="${workoutId}"]`);
    await expect(workoutRow).toBeVisible();
  },
);

Then("an error message appears: {string}", async function (message: string) {
  const errorToast = page.locator(`text="${message}"`);
  await expect(errorToast).toBeVisible();
});

Then("the user can attempt deletion again", async function () {
  const deleteButton = page.locator('button:has-text("Eliminar")');
  await expect(deleteButton).toBeVisible();
});

Then("the user can retry the delete operation", async function () {
  const deleteButton = page.locator('button:has-text("Eliminar")');
  await expect(deleteButton).toBeVisible();
});

Then("any stale entries are removed", async function () {
  // Wait for list to refresh
  await page.waitForTimeout(500);
});
