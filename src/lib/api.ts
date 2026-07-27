import type { Business, NewBusiness, Deadline, Credentials, AuthResponse, WorkPass, NewWorkPass } from "./types";
import { auth } from "./auth";

// VITE_API_BASE_URL lets this point at a different backend later (e.g. once deployed to real
// AWS) without touching code - Vite exposes any env var prefixed VITE_ to the browser bundle.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

// Set once by App on mount (issue #17) - lets request() tell the UI a session has genuinely
// ended (the access token expired *and* refreshing it failed too) without needing a full auth
// context/provider for something this app only needs to react to in one place.
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

// A 401 on an authenticated request usually just means the 24h access token expired mid-session
// (backend issue #26 added refresh specifically for this), not that the user actually logged
// out - exchange the refresh token for a new pair once before giving up. Deliberately attaches
// only the refresh token here, never the access token that just failed.
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  if (!response.ok) return false;

  const body = (await response.json()) as AuthResponse;
  auth.setTokens(body.token, body.refreshToken);
  return true;
}

// skipAuthRetry: set for the auth endpoints themselves - a 401 from login/register is a normal
// "wrong password"/"no account" result, not an expired session, and refresh/logout must never
// try to refresh-and-retry themselves or a failing refresh could recurse into itself.
async function request<T>(path: string, options?: RequestInit, skipAuthRetry = false): Promise<T> {
  const token = auth.getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      // Every business endpoint requires this now (backend issue #19) - attaching it here,
      // in one place, means every api.* call gets it automatically rather than remembering
      // to add it at each call site.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (response.status === 401 && !skipAuthRetry) {
    if (await refreshAccessToken()) {
      return request<T>(path, options, true);
    }
    // Refresh didn't help either - the session is genuinely over (refresh token missing,
    // expired, or already used). Clear local state and let the UI know, then fall through to
    // the normal not-ok handling below so callers still see a rejected promise either way.
    auth.clearToken();
    onSessionExpired?.();
  }

  if (!response.ok) {
    throw new Error(`${options?.method ?? "GET"} ${path} failed: ${response.status}`);
  }

  // Some endpoints (work pass DELETE: 204, auth logout: 200) return no body at all -
  // response.json() throws on an empty string, so read as text first and only parse if there's
  // actually something there, rather than special-casing status codes one at a time.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  register: (credentials: Credentials) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) }, true),

  login: (credentials: Credentials) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }, true),

  logout: () => request<void>("/api/auth/logout", { method: "POST" }, true),

  getBusinesses: () => request<Business[]>("/api/businesses"),

  createBusiness: (business: NewBusiness) =>
    request<Business>("/api/businesses", {
      method: "POST",
      body: JSON.stringify(business),
    }),

  updateBusiness: (businessId: number, business: NewBusiness) =>
    request<Business>(`/api/businesses/${businessId}`, {
      method: "PUT",
      body: JSON.stringify(business),
    }),

  deleteBusiness: (businessId: number) =>
    request<void>(`/api/businesses/${businessId}`, {
      method: "DELETE",
    }),

  getDeadlines: (businessId: number) =>
    request<Deadline[]>(`/api/businesses/${businessId}/deadlines`),

  getWorkPasses: (businessId: number) =>
    request<WorkPass[]>(`/api/businesses/${businessId}/work-passes`),

  createWorkPass: (businessId: number, workPass: NewWorkPass) =>
    request<WorkPass>(`/api/businesses/${businessId}/work-passes`, {
      method: "POST",
      body: JSON.stringify(workPass),
    }),

  deleteWorkPass: (businessId: number, workPassId: number) =>
    request<void>(`/api/businesses/${businessId}/work-passes/${workPassId}`, {
      method: "DELETE",
    }),
};
