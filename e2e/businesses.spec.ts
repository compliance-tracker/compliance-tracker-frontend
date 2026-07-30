import { test, expect } from "@playwright/test";
import { mockEmptyBusinesses, signInAs } from "./mocks";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("adding a business shows it in the list without a page refetch", async ({ page }) => {
  await mockEmptyBusinesses(page);
  await page.route("**/api/businesses", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();

    const body = JSON.parse(route.request().postData() ?? "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 42, incorporationDate: null, ...body }),
    });
  });

  await page.goto("/businesses");
  await expect(page.getByText("No businesses yet — add one to get started.")).toBeVisible();

  await page.getByRole("button", { name: "Add business" }).first().click();
  await page.getByLabel("Business name").fill("Playwright Test Co");
  await page.getByLabel("Financial year end").fill("2026-12-31");
  await page.getByRole("button", { name: "Add business" }).last().click();

  await expect(page.getByText("Playwright Test Co")).toBeVisible();
});

test("searching the business list filters by name client-side", async ({ page }) => {
  await page.route("**/api/businesses", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          { id: 1, name: "Alpha Pte Ltd", financialYearEnd: "2026-12-31", gstRegistered: false, leadTimeDays: 14, incorporationDate: null },
          { id: 2, name: "Beta Pte Ltd", financialYearEnd: "2026-06-30", gstRegistered: true, leadTimeDays: 14, incorporationDate: null },
        ],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      }),
    }),
  );

  await page.goto("/businesses");
  await expect(page.getByText("Alpha Pte Ltd")).toBeVisible();
  await expect(page.getByText("Beta Pte Ltd")).toBeVisible();

  await page.getByPlaceholder("Search by name...").fill("beta");

  await expect(page.getByText("Beta Pte Ltd")).toBeVisible();
  await expect(page.getByText("Alpha Pte Ltd")).not.toBeVisible();
});
