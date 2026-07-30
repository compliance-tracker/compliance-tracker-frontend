import { test, expect } from "@playwright/test";
import { mockEmptyBusinesses, mockNotificationStatus, signInAs } from "./mocks";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
  await mockEmptyBusinesses(page);
});

test("nav rail links reach every top-level page", async ({ page }) => {
  await page.goto("/businesses");
  await expect(page.getByRole("heading", { name: "Businesses" })).toBeVisible();

  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page.getByRole("heading", { name: "Deadlines calendar" })).toBeVisible();

  await mockNotificationStatus(page);
  await page.getByRole("link", { name: "Notifications" }).click();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

  await page.getByRole("link", { name: "Account" }).click();
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
});

test("an unmapped route shows the 404 page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");

  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByText("Page not found")).toBeVisible();

  await page.getByRole("link", { name: "Back to businesses" }).click();
  await expect(page).toHaveURL(/\/businesses$/);
});

test("Work passes/Edit business are disabled until a business is selected, then become real links", async ({ page }) => {
  await page.unroute("**/api/businesses");
  await page.route("**/api/businesses", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          {
            id: 1,
            name: "Test Co Pte Ltd",
            financialYearEnd: "2026-12-31",
            gstRegistered: false,
            leadTimeDays: 14,
            incorporationDate: null,
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    }),
  );
  await page.route("**/api/businesses/1/deadlines", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );
  await page.route("**/api/businesses/1/work-passes", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    }),
  );

  await page.goto("/businesses");
  await expect(page.getByRole("link", { name: "Overview" })).not.toBeVisible();

  await page.getByRole("link", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Test Co Pte Ltd" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/businesses/1");
  await expect(page.getByRole("link", { name: "Edit business" })).toHaveAttribute("href", "/businesses/1/edit");
});
