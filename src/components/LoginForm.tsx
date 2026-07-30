import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarClock, FileCheck2 } from "lucide-react";
import { AuthShell, type AuthValueProp } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiRequestError } from "@/lib/api";
import { auth } from "@/lib/auth";

interface LoginFormProps {
  onAuthenticated: () => void;
  // Set when the user got bounced here by an expired session (issue #17), rather than choosing
  // to log out - explains the unexpected redirect instead of silently dropping them back here.
  message?: string | null;
}

const VALUE_PROPS: AuthValueProp[] = [
  {
    icon: FileCheck2,
    title: "Sourced from real ACRA/IRAS/MOM rules",
    description: "Every deadline formula is sourced from an actual published government page — never invented.",
  },
  {
    icon: CalendarClock,
    title: "Computed from your business's own details",
    description: "Deadlines depend on your Financial Year End and GST status — calculated automatically, not a generic calendar.",
  },
  {
    icon: Bell,
    title: "Reminded before you miss anything",
    description: "See exactly what's coming up and when, at a glance.",
  },
];

export function LoginForm({ onAuthenticated, message }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set on a successful registration (backend issue #120: register no longer returns usable
  // tokens or logs anyone in - login itself now requires a verified email first). Non-null means
  // "show the check-your-email screen instead of the form", same as ForgotPasswordPage's own
  // submitted-state pattern.
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // Set when a *login* attempt (not registration) fails specifically because the account isn't
  // verified yet (backend's 403 FORBIDDEN, distinct from the 401 "wrong credentials" case) -
  // without this, someone who closes the post-registration "check your email" screen (or comes
  // back to log in days later, on a different device, after losing that email) had a real 403
  // message but zero way to trigger a fresh verification email short of re-registering, which
  // just 409s on an already-existing account. Found live, not from a spec - the registration
  // flow's own resend button only ever covers the moment right after registering.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setUnverifiedEmail(null);

    try {
      if (mode === "login") {
        const response = await api.login({ email, password });
        auth.setTokens(response.token, response.refreshToken);
        onAuthenticated();
      } else {
        const response = await api.register({ email, password });
        setRegistrationMessage(response.message);
      }
    } catch (err) {
      // The backend already returns a specific, real message for every login/register failure
      // (wrong credentials, weak password, email already taken, rate-limited, or - since issue
      // #120 - an unverified account trying to log in) - showing it directly is strictly better
      // than a single hardcoded guess per mode.
      setError(
        err instanceof ApiRequestError
          ? err.message
          : mode === "login"
            ? "Incorrect email or password."
            : "Could not register. Is the backend running?"
      );
      if (mode === "login" && err instanceof ApiRequestError && err.code === "FORBIDDEN") {
        setUnverifiedEmail(email);
        setResent(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.resendVerification(email);
    } catch {
      // Deliberately swallowed - same enumeration-avoidance reasoning as forgotPassword, always
      // shown as "sent" regardless of whether the request itself succeeded.
    } finally {
      setResending(false);
      setResent(true);
    }
  }

  function backToLogin() {
    setRegistrationMessage(null);
    setMode("login");
    setPassword("");
    setResent(false);
  }

  return (
    <AuthShell
      brandHeading="Never miss a compliance deadline again."
      brandDescription="A reminder/tracking tool for Singapore SMEs — not compliance advice. Always verify against the official source."
      valueProps={VALUE_PROPS}
    >
      {message && (
        <p
          role="status"
          className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {message}
        </p>
      )}
      <Card className="shadow-sm">
        <CardContent className="space-y-5">
          {registrationMessage ? (
            <>
              <div>
                <CardTitle>Check your email</CardTitle>
                <CardDescription>{registrationMessage}</CardDescription>
              </div>

              {resent ? (
                <p className="text-sm text-muted-foreground">
                  If that account still needs verifying, another email is on its way.
                </p>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>
              )}

              <Button className="w-full" onClick={backToLogin}>
                Back to log in
              </Button>
            </>
          ) : (
            <>
              {/* Segmented mode toggle - two buttons in one pill, active one lifted with the
                  card's own background/shadow. Replaces the old plain-text link toggle below
                  the form; a two-way switch reads more clearly as "pick one of two modes" than
                  a single line of text that changes meaning depending on which mode you're in. */}
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={
                      m === mode
                        ? "rounded-md bg-card py-2 text-sm font-semibold shadow-sm"
                        : "rounded-md py-2 text-sm font-semibold text-muted-foreground"
                    }
                    onClick={() => {
                      setMode(m);
                      setError(null);
                      setUnverifiedEmail(null);
                    }}
                  >
                    {m === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              <div>
                <CardTitle>{mode === "login" ? "Welcome back" : "Create an account"}</CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Access your businesses and their compliance deadlines."
                    : "Track your business's compliance deadlines."}
                </CardDescription>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setUnverifiedEmail(null);
                    }}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <FormError>{error}</FormError>}

                {unverifiedEmail &&
                  (resent ? (
                    <p role="status" className="text-sm text-muted-foreground">
                      If that account still needs verifying, another email is on its way.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResend}
                      disabled={resending}
                    >
                      {resending ? "Sending..." : "Resend verification email"}
                    </Button>
                  ))}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
                </Button>
              </form>

              {mode === "login" && (
                <Link
                  to="/forgot-password"
                  className="block text-center text-sm text-muted-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
