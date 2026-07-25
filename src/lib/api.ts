import type { Business, NewBusiness, Deadline, Credentials, AuthResponse } from "./types";
import { auth } from "./auth";

// VITE_API_BASE_URL lets this point at a different backend later (e.g. once deployed to real
// AWS) without touching code - Vite exposes any env var prefixed VITE_ to the browser bundle.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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

  if (!response.ok) {
    throw new Error(`${options?.method ?? "GET"} ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (credentials: Credentials) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  login: (credentials: Credentials) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  getBusinesses: () => request<Business[]>("/api/businesses"),

  createBusiness: (business: NewBusiness) =>
    request<Business>("/api/businesses", {
      method: "POST",
      body: JSON.stringify(business),
    }),

  getDeadlines: (businessId: number) =>
    request<Deadline[]>(`/api/businesses/${businessId}/deadlines`),
};
