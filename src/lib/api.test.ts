import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { auth } from "./auth";

// api.ts's request() helper isn't exported directly - tested indirectly through api.* methods,
// which is actually the more honest test anyway: it proves the whole call (auth header
// attachment, URL construction, body parsing) works together, not just the helper in isolation.

function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request (via api.* methods)", () => {
  it("attaches the Authorization header when a token is stored", async () => {
    auth.setToken("a-real-token");
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([]),
    });

    await api.getBusinesses();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer a-real-token");
  });

  it("does not attach an Authorization header when there is no stored token", async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([]),
    });

    await api.getBusinesses();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("parses a JSON body on a normal response", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 1, name: "Test Co", financialYearEnd: "2026-12-31", gstRegistered: false }]),
    });

    const businesses = await api.getBusinesses();

    expect(businesses).toEqual([{ id: 1, name: "Test Co", financialYearEnd: "2026-12-31", gstRegistered: false }]);
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
});
