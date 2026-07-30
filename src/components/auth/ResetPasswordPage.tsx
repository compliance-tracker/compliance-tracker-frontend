import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/FormError";
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
    <AuthShell
      brandHeading="Choose a new password."
      brandDescription="Resetting it signs out every other session on your account, everywhere."
    >
      <Card className="shadow-sm">
        <CardContent className="space-y-5">
          <div>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </div>

          {!token ? (
            <FormError>This reset link is missing its token. Request a new one from the login page.</FormError>
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

              {error && <FormError>{error}</FormError>}

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
    </AuthShell>
  );
}
