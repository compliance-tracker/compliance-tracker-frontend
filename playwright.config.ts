import { defineConfig, devices } from "@playwright/test";

// Committed E2E suite (issue #30) - distinct from Vitest/RTL's component-level tests (#9).
// Drives the real built frontend in a real browser, but every backend call is intercepted and
// mocked at the network layer (see e2e/mocks.ts) rather than hitting a real Spring Boot backend -
// keeps this self-contained in the frontend's own CI, no cross-repo Postgres/LocalStack/Maven
// dependency. Catches frontend regressions (rendering, routing, client-side logic); real
// backend-integration bugs (a CORS gap, a response-shape mismatch) are what this project's ad-hoc
// manual Playwright verification already exists to catch per PR, not this suite's job.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
