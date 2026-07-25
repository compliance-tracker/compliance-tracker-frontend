import { useEffect, useState } from "react";
import { AddBusinessDialog } from "@/components/AddBusinessDialog";
import { BusinessList } from "@/components/BusinessList";
import { DeadlinesPanel } from "@/components/DeadlinesPanel";
import { LoginForm } from "@/components/LoginForm";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Business } from "@/lib/types";

function App() {
  // Starting state reads whatever token is already in localStorage - so a page refresh
  // doesn't bounce a logged-in user back to the login screen.
  const [isAuthenticated, setIsAuthenticated] = useState(() => auth.getToken() !== null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    api
      .getBusinesses()
      .then(setBusinesses)
      .catch((err: Error) => {
        // A 401 here means the token is invalid/expired (not just "backend is down") -
        // clearing it and bouncing back to the login screen, rather than showing a
        // confusing "could not reach backend" message for what's actually a logged-out state.
        if (err.message.includes("401")) {
          auth.clearToken();
          setIsAuthenticated(false);
        } else {
          setError("Could not reach the backend. Is it running on port 8081?");
        }
      });
  }, [isAuthenticated]);

  function handleCreated(business: Business) {
    setBusinesses((prev) => [...prev, business]);
  }

  function handleLogout() {
    auth.clearToken();
    setIsAuthenticated(false);
    setBusinesses([]);
    setSelected(null);
  }

  if (!isAuthenticated) {
    return <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Reminder/tracking tool, not compliance advice — always verify against the official source.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddBusinessDialog onCreated={handleCreated} />
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <BusinessList businesses={businesses} selectedId={selected?.id ?? null} onSelect={setSelected} />
      <DeadlinesPanel business={selected} />
    </div>
  );
}

export default App;
