import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiRequestError, registerSessionExpiredHandler } from "./api";
import { auth } from "./auth";

// api.ts's request() helper isn't exported directly - tested indirectly through api.* methods,
// which is actually the more honest test anyway: it proves the whole call (auth header
// attachment, URL construction, body parsing) works together, not just the helper in isolation.

function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// For the refresh-retry tests (issue #17/#26), which need fetch to behave differently across
// its 2-3 calls (the original request, the refresh call, and - if refresh succeeded - the
// retried original request), not the same response every time.
function mockFetchSequence(responses: (Partial<Response> & { ok: boolean })[]) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response as Response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
  // onSessionExpired is a plain module-level reference (see api.ts) so it survives across
  // tests in this file otherwise - reset it so one test's spy can't be silently invoked by a
  // later, unrelated test's 401.
  registerSessionExpiredHandler(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request (via api.* methods)", () => {
  it("attaches the Authorization header when a token is stored", async () => {
    auth.setTokens("a-real-token", "a-real-refresh-token");
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    });

    await api.getBusinesses();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer a-real-token");
  });

  it("does not attach an Authorization header when there is no stored token", async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    });

    await api.getBusinesses();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("parses a JSON body on a normal response", async () => {
    // getBusinesses unwraps the backend's PageResponse envelope (issue #49) down to a plain
    // array - .content is what this test actually cares about, the rest of the envelope is
    // unused by api.ts today.
    mockFetchOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          content: [
            { id: 1, name: "Test Co", financialYearEnd: "2026-12-31", gstRegistered: false, leadTimeDays: 14, incorporationDate: null },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        }),
    });

    const businesses = await api.getBusinesses();

    expect(businesses).toEqual([
      { id: 1, name: "Test Co", financialYearEnd: "2026-12-31", gstRegistered: false, leadTimeDays: 14, incorporationDate: null },
    ]);
  });

  it("returns undefined without throwing for an empty body (e.g. 204 No Content)", async () => {
    mockFetchOnce({
      ok: true,
      status: 204,
      text: async () => "",
    });

    await expect(api.deleteWorkPass(1, 2)).resolves.toBeUndefined();
  });

  it("returns undefined without throwing for a 200 with an empty body (e.g. logout)", async () => {
    // Regression case for issue #41's fix - logout returns 200 with no body, not 204, and the
    // old status-code special-case (204 only) would have thrown parsing this.
    mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => "",
    });

    await expect(api.logout()).resolves.toBeUndefined();
  });

  it("throws an Error including the status code when the response is not ok", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      text: async () => "",
    });

    await expect(api.getBusinesses()).rejects.toThrow("401");
  });

  it("throws an ApiRequestError carrying the backend's real message on a structured error body (issue #47)", async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: "BAD_REQUEST",
          message: "For a first financial year, financialYearEnd cannot be more than 18 months after incorporationDate.",
        }),
    });

    await expect(
      api.createBusiness({
        name: "Test Co",
        financialYearEnd: "2026-12-31",
        gstRegistered: false,
        leadTimeDays: 14,
        incorporationDate: "2026-01-01",
      }),
    ).rejects.toThrow(
      new ApiRequestError(
        "For a first financial year, financialYearEnd cannot be more than 18 months after incorporationDate.",
        "BAD_REQUEST",
      ),
    );
  });

  it("does not mistake Spring Boot's default error page for a real ApiError (issue #69/backend #115)", async () => {
    // Spring's own default error body happens to have `error` and `message` string fields too,
    // by coincidence - the exact shape our own ApiError record has - but also carries at least
    // `timestamp`/`status`/`path`, which a genuine ApiError body never does. A raw, unintended
    // 500 like this should fall back to the generic Error path, not leak the internal exception
    // message (found live: a raw Hibernate exception message rendered straight onto the page).
    mockFetchOnce({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          timestamp: "2026-07-29T12:00:00.000+00:00",
          status: 500,
          error: "Internal Server Error",
          message: "Unexpected row count (expected row count 1 but was 0) [delete from email_verification_token where id=?]",
          path: "/api/auth/verify-email",
        }),
    });

    await expect(api.getBusinesses()).rejects.not.toBeInstanceOf(ApiRequestError);
  });
});

describe("silent refresh on 401 (issues #17/#26)", () => {
  it("retries the original request with a new access token after a successful refresh", async () => {
    auth.setTokens("expired-token", "a-valid-refresh-token");
    const fetchMock = mockFetchSequence([
      { ok: false, status: 401, text: async () => "" },
      { ok: true, status: 200, json: async () => ({ token: "new-token", refreshToken: "new-refresh-token" }) },
      { ok: true, status: 200, text: async () => JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }) },
    ]);

    const businesses = await api.getBusinesses();

    expect(businesses).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [refreshUrl, refreshOptions] = fetchMock.mock.calls[1];
    expect(refreshUrl).toContain("/api/auth/refresh");
    expect(refreshOptions.headers.Authorization).toBe("Bearer a-valid-refresh-token");

    const [, retryOptions] = fetchMock.mock.calls[2];
    expect(retryOptions.headers.Authorization).toBe("Bearer new-token");

    expect(auth.getToken()).toBe("new-token");
    expect(auth.getRefreshToken()).toBe("new-refresh-token");
  });

  it("clears tokens and notifies the session-expired handler when refresh also fails", async () => {
    auth.setTokens("expired-token", "an-expired-refresh-token");
    mockFetchSequence([
      { ok: false, status: 401, text: async () => "" },
      { ok: false, status: 401, text: async () => "" },
    ]);
    const handler = vi.fn();
    registerSessionExpiredHandler(handler);

    await expect(api.getBusinesses()).rejects.toThrow("401");

    expect(handler).toHaveBeenCalledOnce();
    expect(auth.getToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
  });

  it("does not attempt a refresh when there is no stored refresh token at all", async () => {
    const fetchMock = mockFetchOnce({ ok: false, status: 401, text: async () => "" });

    await expect(api.getBusinesses()).rejects.toThrow("401");

    // Only the original request - no second call to /api/auth/refresh, since there was no
    // refresh token to even try sending.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not attempt to refresh a 401 from login itself", async () => {
    auth.setTokens("stale-token", "a-stale-refresh-token");
    const fetchMock = mockFetchOnce({ ok: false, status: 401, text: async () => "" });

    await expect(api.login({ email: "owner@example.com", password: "wrong" })).rejects.toThrow("401");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
