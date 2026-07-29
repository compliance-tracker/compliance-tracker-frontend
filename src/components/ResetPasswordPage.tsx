import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiRequestError } from "@/lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.resetPassword(token, newPassword);
      setSucceeded(true);
    } catch (err) {
      // A real, specific reason either way: an expired/already-used token (401) or a weak new
      // password (400) - both come back as an ApiRequestError with the backend's actual message.
      setError(err instanceof ApiRequestError ? err.message : "Could not reset password. Is the backend running?");
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
          <CardContent className="space-y-5">
            <div>
              <CardTitle>Set a new password</CardTitle>
              <CardDescription>Choose a new password for your account.</CardDescription>
            </div>

            {!token ? (
              <p className="text-sm text-destructive">
                This reset link is missing its token. Request a new one from the login page.
              </p>
            ) : succeeded ? (
              <p className="text-sm text-muted-foreground">
                Password reset. You can now log in with your new password.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Resetting..." : "Reset password"}
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
