// The JWT itself carries everything the backend needs to know who's asking (see backend's
// JwtService) - the frontend's only job is holding onto it between page loads and attaching it
// to every request. localStorage (not sessionStorage) so a refresh/new tab doesn't log you out.
const TOKEN_KEY = "compliance_tracker_token";

export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clearToken: (): void => localStorage.removeItem(TOKEN_KEY),
};
