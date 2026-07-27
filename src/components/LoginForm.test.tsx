import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

vi.mock("@/lib/api", () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.login).mockReset();
  vi.mocked(api.register).mockReset();
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
    render(<LoginForm onAuthenticated={vi.fn()} />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(submitButton()).toHaveTextContent("Log in");
  });

  it("switches to register mode when the Sign up toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginForm onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("switches back to login mode when the Log in toggle is clicked again", async () => {
    const user = userEvent.setup();
    render(<LoginForm onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("on successful login, stores the token and calls onAuthenticated", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "a-real-token" });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(submitButton());

    expect(api.login).toHaveBeenCalledWith({ email: "owner@example.com", password: "correct-password" });
    expect(auth.getToken()).toBe("a-real-token");
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("on failed login, shows an error and does not call onAuthenticated", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("POST /api/auth/login failed: 401"));
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(submitButton());

    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(auth.getToken()).toBeNull();
  });

  it("on successful registration, calls api.register (not api.login)", async () => {
    vi.mocked(api.register).mockResolvedValue({ token: "a-new-token" });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "a-new-password");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(api.register).toHaveBeenCalledWith({ email: "new@example.com", password: "a-new-password" });
    expect(api.login).not.toHaveBeenCalled();
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });
});
