import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { AccountPage } from "./AccountPage";
import { auth } from "@/lib/auth";

function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

function renderWithContext(onLogout: () => void) {
  return render(
    <MemoryRouter initialEntries={["/account"]}>
      <Routes>
        <Route
          element={
            <Outlet
              context={{
                businesses: [],
                loading: false,
                error: null,
                onCreated: vi.fn(),
                onUpdated: vi.fn(),
                onDeleted: vi.fn(),
                onLogout,
              }}
            />
          }
        >
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AccountPage", () => {
  it("shows the registered email, read-only", () => {
    auth.setTokens(fakeJwt({ sub: "owner@example.com" }), "a-refresh-token");

    renderWithContext(vi.fn());

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.value).toBe("owner@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("shows a disabled Change password control, not implying it actually works", () => {
    renderWithContext(vi.fn());

    expect(screen.getByRole("button", { name: /Change/ })).toBeDisabled();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("calls onLogout when Log out is clicked", async () => {
    const onLogout = vi.fn();
    renderWithContext(onLogout);

    screen.getByRole("button", { name: "Log out" }).click();

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
