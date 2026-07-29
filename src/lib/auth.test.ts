import { afterEach, describe, expect, it } from "vitest";
import { auth } from "./auth";

// A real JWT has three base64url segments (header.payload.signature) - only the payload's
// content matters for getEmail(), so header/signature are throwaway placeholders here, same as
// the backend never checking anything but its own signature on tokens it issued.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

afterEach(() => {
  localStorage.clear();
});

describe("auth.getEmail", () => {
  it("returns null when there's no stored token at all", () => {
    expect(auth.getEmail()).toBeNull();
  });

  it("decodes the sub claim from the stored access token", () => {
    auth.setTokens(fakeJwt({ sub: "owner@example.com" }), "a-refresh-token");

    expect(auth.getEmail()).toBe("owner@example.com");
  });

  it("returns null for a malformed token instead of throwing", () => {
    auth.setTokens("not-a-real-jwt", "a-refresh-token");

    expect(auth.getEmail()).toBeNull();
  });
});
