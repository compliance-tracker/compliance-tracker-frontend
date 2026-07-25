import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

interface LoginFormProps {
  onAuthenticated: () => void;
}

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/40 to-background p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
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
  );
}
