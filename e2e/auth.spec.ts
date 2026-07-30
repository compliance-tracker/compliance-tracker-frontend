import { test, expect } from "@playwright/test";

// Auth flows (issue #30) - the API is mocked (see e2e/mocks.ts), so these exercise the real
// frontend logic (form state, routing after each outcome, error display) without a live backend.

test("registering shows the check-your-email screen, not the dashboard (issue #75)", async ({ page }) => {
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Registration successful. Check your email to verify your account, then log in." }),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByLabel("Email").fill("new@example.com");
  await page.getByLabel("Password").fill("a-real-password1");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  await expect(page.getByText("Businesses tracked")).not.toBeVisible();
});

test("shows the backend's real message when login fails", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "UNAUTHORIZED", message: "Incorrect email or password." }),
    }),
  );

  await page.goto("/");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.locator("form").getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});

test("shows the backend's real message for an unverified account (backend issue #120)", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "FORBIDDEN", message: "Please verify your email before logging in." }),
    }),
  );

  await page.goto("/");
  await page.getByLabel("Email").fill("unverified@example.com");
  await page.getByLabel("Password").fill("correct-password");
  await page.locator("form").getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Please verify your email before logging in.")).toBeVisible();
});

test("logs in successfully and lands on the businesses page", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "a-fake-access-token", refreshToken: "a-fake-refresh-token" }),
    }),
  );
  await page.route("**/api/businesses", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    }),
  );

  await page.goto("/");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("correct-password");
  await page.locator("form").getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Businesses tracked")).toBeVisible();
  await expect(page).toHaveURL(/\/businesses$/);
});
