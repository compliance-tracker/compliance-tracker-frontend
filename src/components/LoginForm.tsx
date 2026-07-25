import { useState } from "react";
import { Bell, CalendarClock, FileCheck2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

interface LoginFormProps {
  onAuthenticated: () => void;
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

export function LoginForm({ onAuthenticated }: LoginFormProps) {
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

      auth.setToken(response.token);
      onAuthenticated();
    } catch {
      setError(
        mode === "login"
          ? "Incorrect email or password."
          : "Could not register. That email may already be taken."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding/value-prop panel - hidden on small screens, since there's no room for it
          alongside the form without both feeling cramped. */}
      <div className="hidden flex-col justify-center gap-10 bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Compliance Tracker</span>
        </div>

        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">
            Never miss a compliance deadline again.
          </h2>
          <p className="text-primary-foreground/80">
            A reminder/tracking tool for Singapore SMEs — not compliance advice. Always verify
            against the official source.
          </p>
        </div>

        <div className="max-w-md space-y-6">
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

      {/* Form panel */}
      <div className="flex items-center justify-center bg-gradient-to-b from-muted/40 to-background p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Compliance Tracker</h1>
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{mode === "login" ? "Log in" : "Create an account"}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Access your businesses and their compliance deadlines."
                  : "Track your business's compliance deadlines."}
              </CardDescription>
            </CardHeader>
            <CardContent>
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

                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:underline"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                >
                  {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
