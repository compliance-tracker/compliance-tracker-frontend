import { useEffect, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, ApiRequestError } from "@/lib/api";

type Status = "verifying" | "verified" | "error";

// Verify Email (backend issue #36, wired up here for the first time - issue #69) - deliberately
// a lighter, centered single-card treatment, NOT the full AuthShell split panel Login/Forgot/
// Reset use. Verification is informational only and non-blocking (nothing in the app enforces
// emailVerified yet), so it shouldn't carry the same visual weight as a real auth gate. Reachable
// with no session at all (a fresh click from the verification email), so this is a standalone
// top-level route, not nested inside the authenticated Shell/NavRail.
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    api
      .verifyEmail(token)
      .then(() => setStatus("verified"))
      .catch((err: unknown) => {
        setErrorMessage(err instanceof ApiRequestError ? err.message : "Could not verify email. Is the backend running?");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-[70px] text-center">
      {status === "verifying" && <p className="text-sm text-muted-foreground">Verifying your email...</p>}

      {status === "verified" && (
        <>
          <div className="mb-4.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <CheckCircle2 className="h-[22px] w-[22px]" />
          </div>
          <h1 className="mb-1.5 font-serif text-lg">Email verified</h1>
          <p className="mb-5 max-w-[38ch] text-[13.5px] text-muted-foreground">You're all set.</p>
          <Button asChild>
            <Link to="/businesses">Continue to dashboard</Link>
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mb-4.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-amber/12 text-amber">
            <MailCheck className="h-[22px] w-[22px]" />
          </div>
          <h1 className="mb-1.5 font-serif text-lg">Couldn't verify email</h1>
          <p className="mb-5 max-w-[38ch] text-[13.5px] text-muted-foreground">
            {token ? errorMessage : "This link is missing its token."} Verifying isn't required to use the
            app — it just helps us reach you about anything time-sensitive.
          </p>
          <Button asChild>
            <Link to="/businesses">Continue to dashboard</Link>
          </Button>
        </>
      )}
    </div>
  );
}
