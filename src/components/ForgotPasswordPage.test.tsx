import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { forgotPassword: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.forgotPassword).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  it("shows the same neutral message regardless of whether the email exists (enumeration-avoidance)", async () => {
    vi.mocked(api.forgotPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(api.forgotPassword).toHaveBeenCalledWith("someone@example.com");
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });

  it("shows the same neutral message even if the request itself fails", async () => {
    // Deliberate: revealing a distinction between "request failed" and "request succeeded" here
    // would leak more than the neutral message already doesn't (see api.ts's forgotPassword).
    vi.mocked(api.forgotPassword).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });
});
