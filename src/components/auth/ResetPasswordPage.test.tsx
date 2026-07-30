import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { api, ApiRequestError } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { resetPassword: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.resetPassword).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage(path = "/reset-password?token=a-real-token") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  it("shows a missing-token message and no form when the URL has no token", () => {
    renderPage("/reset-password");

    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("submits the token from the URL alongside the new password, and shows success", async () => {
    vi.mocked(api.resetPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage("/reset-password?token=a-real-token");

    await user.type(screen.getByLabelText("New password"), "a-new-real-password1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(api.resetPassword).toHaveBeenCalledWith("a-real-token", "a-new-real-password1");
    expect(await screen.findByText(/password reset/i)).toBeInTheDocument();
  });

  it("shows the backend's real message on an invalid/expired token", async () => {
    vi.mocked(api.resetPassword).mockRejectedValue(new ApiRequestError("Invalid or expired reset token.", "UNAUTHORIZED"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("New password"), "a-new-real-password1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Invalid or expired reset token.")).toBeInTheDocument();
  });
});
