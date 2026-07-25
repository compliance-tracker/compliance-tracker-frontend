import type { Business, NewBusiness, Deadline } from "./types";

// VITE_API_BASE_URL lets this point at a different backend later (e.g. once deployed to real
// AWS) without touching code - Vite exposes any env var prefixed VITE_ to the browser bundle.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${options?.method ?? "GET"} ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getBusinesses: () => request<Business[]>("/api/businesses"),

  createBusiness: (business: NewBusiness) =>
    request<Business>("/api/businesses", {
      method: "POST",
      body: JSON.stringify(business),
    }),

  getDeadlines: (businessId: number) =>
    request<Deadline[]>(`/api/businesses/${businessId}/deadlines`),
};
