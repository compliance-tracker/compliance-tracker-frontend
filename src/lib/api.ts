import type { ApiError, Business, NewBusiness, Deadline, Credentials, AuthResponse, RegistrationResponse, WorkPass, NewWorkPass, PageResponse, NotificationStatus } from "./types";
import { auth } from "./auth";

// Thrown by request() on any non-ok response - carries the backend's real ApiError message
// (issue #47) when the body actually has one, rather than every caller only ever seeing a
// generic "request failed: 400" with no way to show the user what actually went wrong.
export class ApiRequestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// Spring Boot's own default error page (an uncaught exception the backend never turned into a
// real ApiError - a genuine 500, never an intentional one) happens to serialize with `error` and
// `message` string fields too - by coincidence, the exact same two keys our own ApiError record
// has. Found live (frontend issue #69's Verify Email work, backend issue #115): a raw Hibernate
// exception message leaked straight onto the page because the old check here matched Spring's
// default shape as if it were our own. Spring's version always carries at least `timestamp`,
// `status`, and `path` alongside them; our ApiError record only ever serializes exactly
// `{error, message}`, nothing else - checking the key count is what tells the two apart.
function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as ApiError).error === "string" &&
    typeof (body as ApiError).message === "string" &&
    Object.keys(body).length === 2
  );
}

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

  // Some endpoints (work pass DELETE: 204, auth logout: 200) return no body at all -
  // response.json() throws on an empty string, so read as text first and only parse if there's
  // actually something there, rather than special-casing status codes one at a time. Reading
  // the body before checking response.ok (rather than after, as before) is what lets a non-ok
  // response's ApiError body actually get inspected below instead of being discarded unread.
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiRequestError(body.message, body.error);
    }
    throw new Error(`${options?.method ?? "GET"} ${path} failed: ${response.status}`);
  }

  return body as T;
}

export const api = {
  // No longer returns usable tokens (backend issue #120) - registration alone doesn't log
  // anyone in anymore, since login itself now requires a verified email. Just a confirmation
  // message telling the user what to do next.
  register: (credentials: Credentials) =>
    request<RegistrationResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) }, true),

  login: (credentials: Credentials) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }, true),

  logout: () => request<void>("/api/auth/logout", { method: "POST" }, true),

  // Always resolves 200 regardless of whether the email actually exists (backend issue #37,
  // same enumeration-avoidance reasoning as login's identical 401 for both "no such user" and
  // "wrong password") - callers should show one neutral message either way, never branch on
  // whether this "succeeded" as a signal of whether the account exists.
  forgotPassword: (email: string) =>
    request<void>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }, true),

  // 401 (invalid/expired token) or 400 (weak password) via ApiRequestError - both need to reach
  // the user as the real reason, not a generic failure.
  resetPassword: (token: string, newPassword: string) =>
    request<void>(
      "/api/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, newPassword }) },
      true,
    ),

  // 401 (invalid/expired/already-used token) via ApiRequestError (backend issue #36). Verifying
  // is informational only - nothing in the app currently gates on the result.
  verifyEmail: (token: string) =>
    request<void>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }, true),

  // Backend now returns a PageResponse envelope, not a bare array (issue #49 / this issue #46)
  // - unwraps .content immediately so every existing caller keeps working unchanged. The
  // backend's default page size (20) already covers realistic current usage; a real "load
  // more"/page-navigation UI would thread page/size through as real params instead, but isn't
  // needed yet.
  getBusinesses: () => request<PageResponse<Business>>("/api/businesses").then((page) => page.content),

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

  // Same PageResponse unwrap as getBusinesses above (backend issue #49).
  getWorkPasses: (businessId: number) =>
    request<PageResponse<WorkPass>>(`/api/businesses/${businessId}/work-passes`).then((page) => page.content),

  createWorkPass: (businessId: number, workPass: NewWorkPass) =>
    request<WorkPass>(`/api/businesses/${businessId}/work-passes`, {
      method: "POST",
      body: JSON.stringify(workPass),
    }),

  deleteWorkPass: (businessId: number, workPassId: number) =>
    request<void>(`/api/businesses/${businessId}/work-passes/${workPassId}`, {
      method: "DELETE",
    }),

  // Backend issue #114 - which NotificationSender channel is active, and the from-address if
  // it's email. App-level server config, not per-account, so there's nothing to set here.
  getNotificationStatus: () => request<NotificationStatus>("/api/notifications/status"),

  // Always resolves 200 regardless of whether the email exists or is already verified (backend
  // issue #120, same enumeration-avoidance shape as forgotPassword) - without this, a real
  // verification email that never arrives leaves a new account stuck with no way to get one:
  // the account already exists, so re-registering just hits a 409.
  resendVerification: (email: string) =>
    request<void>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }, true),
};
