import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { api, ApiRequestError } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { ComponentProps } from "react";

// LoginForm renders a react-router <Link> (the new "Forgot password?" link, issue #55), which
// throws without a Router context above it - MemoryRouter is the standard test-only stand-in,
// same idea as the real BrowserRouter used in main.tsx but without touching the actual URL.
function renderLoginForm(props: ComponentProps<typeof LoginForm>) {
  return render(
    <MemoryRouter>
      <LoginForm {...props} />
    </MemoryRouter>,
  );
}

// Keeps the real ApiRequestError export (LoginForm does `err instanceof ApiRequestError`,
// which throws if that's undefined) while still stubbing out login/register themselves.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      login: vi.fn(),
      register: vi.fn(),
      resendVerification: vi.fn(),
    },
  };
});

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.login).mockReset();
  vi.mocked(api.register).mockReset();
  vi.mocked(api.resendVerification).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// The submit button's text mirrors the segmented toggle button's text in login mode (both say
// "Log in"), so a plain screen.getByRole("button", { name: "Log in" }) is ambiguous - the
// submit button is the only one actually inside <form>, so scoping the query there
// disambiguates it from the toggle sitting just above the form.
function submitButton() {
  const form = document.querySelector("form");
  if (!form) throw new Error("form not found");
  return within(form).getByRole("button");
}

describe("LoginForm", () => {
  it("defaults to login mode", () => {
    renderLoginForm({ onAuthenticated: vi.fn() });

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(submitButton()).toHaveTextContent("Log in");
  });

  it("switches to register mode when the Sign up toggle is clicked", async () => {
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("switches back to login mode when the Log in toggle is clicked again", async () => {
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("on successful login, stores both tokens and calls onAuthenticated", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "a-real-token", refreshToken: "a-real-refresh-token" });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated });

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(submitButton());

    expect(api.login).toHaveBeenCalledWith({ email: "owner@example.com", password: "correct-password" });
    expect(auth.getToken()).toBe("a-real-token");
    expect(auth.getRefreshToken()).toBe("a-real-refresh-token");
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("on failed login, shows an error and does not call onAuthenticated", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("POST /api/auth/login failed: 401"));
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated });

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(submitButton());

    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(auth.getToken()).toBeNull();
  });

  it("on successful registration, shows the check-your-email screen instead of logging in (issue #120)", async () => {
    // Backend #120: register no longer returns tokens or logs anyone in - login itself now
    // requires a verified email, so there's nothing to authenticate with yet.
    vi.mocked(api.register).mockResolvedValue({
      message: "Registration successful. Check your email to verify your account, then log in.",
    });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "a-new-password");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(api.register).toHaveBeenCalledWith({ email: "new@example.com", password: "a-new-password" });
    expect(api.login).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(auth.getToken()).toBeNull();
    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(
      screen.getByText("Registration successful. Check your email to verify your account, then log in."),
    ).toBeInTheDocument();
  });

  it("lets the user resend the verification email from the check-your-email screen", async () => {
    vi.mocked(api.register).mockResolvedValue({ message: "Check your email." });
    vi.mocked(api.resendVerification).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "a-new-password");
    await user.click(screen.getByRole("button", { name: "Register" }));
    await screen.findByText("Check your email");

    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    expect(api.resendVerification).toHaveBeenCalledWith("new@example.com");
    expect(await screen.findByText(/another email is on its way/)).toBeInTheDocument();
  });

  it("returns to the login form from the check-your-email screen", async () => {
    vi.mocked(api.register).mockResolvedValue({ message: "Check your email." });
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "a-new-password");
    await user.click(screen.getByRole("button", { name: "Register" }));
    await screen.findByText("Check your email");

    await user.click(screen.getByRole("button", { name: "Back to log in" }));

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("shows the backend's real message when logging in with an unverified account (backend issue #120)", async () => {
    vi.mocked(api.login).mockRejectedValue(
      new ApiRequestError("Please verify your email before logging in.", "FORBIDDEN"),
    );
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated });

    await user.type(screen.getByLabelText("Email"), "unverified@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(submitButton());

    expect(await screen.findByText("Please verify your email before logging in.")).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("offers a way to resend the verification email right on the login failure, not just after registering", async () => {
    // Found live, not from a spec: someone who closes the post-registration "check your email"
    // screen (or comes back to log in later, having lost that email) previously had a real 403
    // error message and no way at all to get a fresh verification email short of re-registering,
    // which just 409s on an already-existing account.
    vi.mocked(api.login).mockRejectedValue(
      new ApiRequestError("Please verify your email before logging in.", "FORBIDDEN"),
    );
    vi.mocked(api.resendVerification).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.type(screen.getByLabelText("Email"), "stuck@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(submitButton());
    await screen.findByText("Please verify your email before logging in.");

    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    expect(api.resendVerification).toHaveBeenCalledWith("stuck@example.com");
    expect(await screen.findByText(/another email is on its way/)).toBeInTheDocument();
  });

  it("does not offer a resend button for a plain wrong-password failure (401), only an unverified-account one (403)", async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiRequestError("Incorrect email or password.", "UNAUTHORIZED"));
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(submitButton());

    await screen.findByText("Incorrect email or password.");
    expect(screen.queryByRole("button", { name: "Resend verification email" })).not.toBeInTheDocument();
  });

  it("shows the backend's real message on a failed registration (issue #52)", async () => {
    // Proves the specific, real backend message reaches the user - not the old single
    // hardcoded "that email may already be taken" guess, which used to show even for an
    // unrelated weak-password rejection.
    vi.mocked(api.register).mockRejectedValue(
      new ApiRequestError("Password must be at least 8 characters and include a letter and a digit.", "BAD_REQUEST"),
    );
    const user = userEvent.setup();
    renderLoginForm({ onAuthenticated: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "weak");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("Password must be at least 8 characters and include a letter and a digit."),
    ).toBeInTheDocument();
  });

  it("shows the session-expired message when passed one, and not otherwise", () => {
    const { rerender } = renderLoginForm({ onAuthenticated: vi.fn() });
    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <LoginForm onAuthenticated={vi.fn()} message="Your session expired. Please log in again." />
      </MemoryRouter>,
    );
    expect(screen.getByText("Your session expired. Please log in again.")).toBeInTheDocument();
  });
});
