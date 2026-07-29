import { useState } from "react";
import { Bell, CalendarClock, FileCheck2, ShieldCheck } from "lucide-react";
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

const VALUE_PROPS = [
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding/value-prop panel - hidden on small screens, since there's no room for it
          alongside the form without both feeling cramped. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[oklch(0.32_0.12_264)] via-primary to-[oklch(0.5_0.2_280)] p-12 text-primary-foreground lg:flex">
        {/* Purely decorative blurred shapes - texture/depth so the panel doesn't read as a
            flat single-color fill. pointer-events-none + aria-hidden since they carry no
            content, just visual interest. */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Compliance Tracker</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">
              Never miss a compliance deadline again.
            </h2>
            <p className="text-primary-foreground/80">
              A reminder/tracking tool for Singapore SMEs — not compliance advice. Always verify
              against the official source.
            </p>
          </div>

          <div className="space-y-6">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-primary-foreground/70">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          Built for Singapore SMEs — deadline rules sourced directly from ACRA, IRAS, and MOM.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-gradient-to-b from-muted/40 to-background p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Compliance Tracker</h1>
          </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
