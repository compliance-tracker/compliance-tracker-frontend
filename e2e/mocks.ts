import type { Page } from "@playwright/test";

// Shared mock-response helpers for the E2E suite (issue #30) - every backend call is
// intercepted here rather than hitting a real Spring Boot backend, see playwright.config.ts's
// own comment for why.

function jsonRoute(page: Page, urlPattern: string, body: unknown, status = 200) {
  return page.route(urlPattern, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

// A real JWT has three base64url segments - only the payload's shape matters here (auth.getEmail()
// decodes the `sub` claim), so header/signature are throwaway placeholders, same technique used
// by this repo's own auth.test.ts.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

// Storage keys are duplicated from src/lib/auth.ts rather than imported - e2e/ deliberately has
// no dependency on the app's own source, since it's meant to exercise the built app as a real
// black box, the same way a real browser session would.
const TOKEN_KEY = "compliance_tracker_token";
const REFRESH_TOKEN_KEY = "compliance_tracker_refresh_token";

// Seeds localStorage with a fake-but-well-formed JWT pair before the app loads, so a test can
// start already "logged in" without driving the login form itself - keeps tests that are really
// about some other page (Calendar, Account, business CRUD) focused on that page, not repeating
// the login flow which auth.spec.ts already covers on its own.
export async function signInAs(page: Page, email = "owner@example.com") {
  await page.addInitScript(
    ({ tokenKey, refreshKey, token }) => {
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(refreshKey, token);
    },
    { tokenKey: TOKEN_KEY, refreshKey: REFRESH_TOKEN_KEY, token: fakeJwt({ sub: email }) },
  );
}

export function mockEmptyBusinesses(page: Page) {
  return jsonRoute(page, "**/api/businesses", { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
}

export function mockNotificationStatus(page: Page, status: { channel: string; fromAddress?: string } = { channel: "logging" }) {
  return jsonRoute(page, "**/api/notifications/status", status);
}
