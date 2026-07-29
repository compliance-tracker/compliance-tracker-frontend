import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Deliberately a single boolean, not an error/success split - the backend always resolves 200
  // here regardless of whether the email exists (enumeration-avoidance, see api.ts), so there's
  // no real failure case to distinguish from success once the request itself went through.
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.forgotPassword(email);
    } catch {
      // Deliberately swallowed, not surfaced - shown as success either way (see below), since
      // distinguishing "request failed" from "request succeeded" here would leak more than the
      // neutral message already doesn't.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
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
          <CardContent className="space-y-5">
            <div>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>
                Enter your account's email and we'll send a reset link if it exists.
              </CardDescription>
            </div>

            {submitted ? (
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, a reset link is on its way. Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}

            <Link to="/" className="block text-center text-sm text-muted-foreground hover:underline">
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
