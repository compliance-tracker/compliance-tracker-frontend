import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VerifyEmailPage } from "./VerifyEmailPage";
import { api, ApiRequestError } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { verifyEmail: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.verifyEmail).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  it("shows an error and never calls the API when the URL has no token", () => {
    renderAt("/verify-email");

    expect(screen.getByText("Couldn't verify email")).toBeInTheDocument();
    expect(screen.getByText(/missing its token/)).toBeInTheDocument();
    expect(api.verifyEmail).not.toHaveBeenCalled();
  });

  it("calls the real verify-email endpoint with the token and shows success", async () => {
    vi.mocked(api.verifyEmail).mockResolvedValue(undefined);

    renderAt("/verify-email?token=a-real-token");

    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect(api.verifyEmail).toHaveBeenCalledWith("a-real-token");
  });

  it("shows the backend's real message when the token is invalid or expired", async () => {
    vi.mocked(api.verifyEmail).mockRejectedValue(
      new ApiRequestError("Invalid or expired verification token.", "UNAUTHORIZED"),
    );

    renderAt("/verify-email?token=a-stale-token");

    expect(await screen.findByText(/Invalid or expired verification token\./)).toBeInTheDocument();
  });
});
