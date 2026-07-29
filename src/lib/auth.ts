// The JWT itself carries everything the backend needs to know who's asking (see backend's
// JwtService) - the frontend's only job is holding onto it between page loads and attaching it
// to every request. localStorage (not sessionStorage) so a refresh/new tab doesn't log you out.
const TOKEN_KEY = "compliance_tracker_token";
// The longer-lived refresh token (backend issue #26) - never attached to normal API requests,
// only ever sent to POST /api/auth/refresh to get a new access/refresh pair without a real login.
const REFRESH_TOKEN_KEY = "compliance_tracker_refresh_token";

// Decodes a JWT's payload without verifying the signature - fine here, since this only ever
// reads a token the backend itself just issued to this same browser (never a token from an
// untrusted source), purely to display info already inside it. Never use this pattern to trust
// a token's claims for anything security-relevant - that's the backend's job (JwtAuthenticationFilter),
// not this frontend's.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (token: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  // The backend has no "get current user" endpoint (issue #67) - the access token's own `sub`
  // claim already is the user's email (see backend's JwtService), so reading it directly here
  // avoids adding an API call for something already on hand.
  getEmail: (): string | null => {
    const token = auth.getToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    return typeof payload?.sub === "string" ? payload.sub : null;
  },
};
