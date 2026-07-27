// The JWT itself carries everything the backend needs to know who's asking (see backend's
// JwtService) - the frontend's only job is holding onto it between page loads and attaching it
// to every request. localStorage (not sessionStorage) so a refresh/new tab doesn't log you out.
const TOKEN_KEY = "compliance_tracker_token";
// The longer-lived refresh token (backend issue #26) - never attached to normal API requests,
// only ever sent to POST /api/auth/refresh to get a new access/refresh pair without a real login.
const REFRESH_TOKEN_KEY = "compliance_tracker_refresh_token";

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
};
