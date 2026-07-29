import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarClock, FileCheck2 } from "lucide-react";
import { AuthShell, type AuthValueProp } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = mode === "login"
        ? await api.login({ email, password })
        : await api.register({ email, password });

      auth.setTokens(response.token, response.refreshToken);
      onAuthenticated();
    } catch (err) {
      // The backend already returns a specific, real message for every login/register failure
      // (wrong credentials, weak password, email already taken, rate-limited) - showing it
      // directly is strictly better than the single hardcoded guess this used to make per mode,
      // which mislabeled e.g. a weak-password rejection as "email may already be taken".
      setError(
        err instanceof ApiRequestError
          ? err.message
          : mode === "login"
            ? "Incorrect email or password."
            : "Could not register. Is the backend running?"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      brandHeading="Never miss a compliance deadline again."
      brandDescription="A reminder/tracking tool for Singapore SMEs — not compliance advice. Always verify against the official source."
      valueProps={VALUE_PROPS}
    >
      {message && (
        <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {message}
        </p>
      )}
      <Card className="shadow-sm">
        <CardContent className="space-y-5">
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
                onChange={(e) => setEmail(e.target.value)}
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

            {error && <p className="text-sm text-destructive">{error}</p>}

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
        </CardContent>
      </Card>
    </AuthShell>
  );
}
