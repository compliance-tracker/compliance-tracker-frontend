import { useEffect, useState } from "react";
import { Building2, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { AddBusinessDialog } from "@/components/AddBusinessDialog";
import { BusinessList } from "@/components/BusinessList";
import { DeadlinesPanel } from "@/components/DeadlinesPanel";
import { LoginForm } from "@/components/LoginForm";
import { StatCard } from "@/components/StatCard";
import { WorkPassesPanel } from "@/components/WorkPassesPanel";
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
  // Bumped whenever a work pass is added/removed, so DeadlinesPanel knows to refetch even
  // though `selected` itself hasn't changed (see DeadlinesPanel's refreshKey prop).
  const [deadlinesRefreshKey, setDeadlinesRefreshKey] = useState(0);

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

  function handleUpdated(business: Business) {
    setBusinesses((prev) => prev.map((b) => (b.id === business.id ? business : b)));
    // Keep `selected` in sync too - it's a separate copy of the same business, not a reference
    // into the `businesses` array, so editing (e.g. a new FYE) wouldn't otherwise be reflected
    // in DeadlinesPanel/WorkPassesPanel's "{business.name} — ..." headers or refetch anything.
    setSelected((prev) => (prev?.id === business.id ? business : prev));
    setDeadlinesRefreshKey((k) => k + 1);
  }

  function handleDeleted(businessId: number) {
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    setSelected((prev) => (prev?.id === businessId ? null : prev));
  }

  async function handleLogout() {
    // Best-effort: tell the server to revoke the token (issue #41) so it can't be reused if
    // it ever leaked. Still clear local state even if this fails (backend unreachable, token
    // already expired, etc.) - a logout button should never leave the user stuck "logged in"
    // just because the server call didn't go through.
    try {
      await api.logout();
    } catch {
      // ignored - see above
    }

    auth.clearToken();
    setIsAuthenticated(false);
    setBusinesses([]);
    setSelected(null);
  }

  if (!isAuthenticated) {
    return <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  const gstRegisteredCount = businesses.filter((b) => b.gstRegistered).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="mx-auto max-w-6xl p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Compliance Tracker</h1>
              <p className="text-sm text-muted-foreground">
                Reminder/tracking tool, not compliance advice — always verify against the official source.
              </p>
            </div>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Businesses tracked" value={businesses.length} icon={Building2} />
          <StatCard label="GST-registered" value={gstRegisteredCount} icon={CheckCircle2} />
          <StatCard label="Not GST-registered" value={businesses.length - gstRegisteredCount} icon={XCircle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BusinessList
            businesses={businesses}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
          <DeadlinesPanel business={selected} refreshKey={deadlinesRefreshKey} />
        </div>

        <WorkPassesPanel
          business={selected}
          onWorkPassesChanged={() => setDeadlinesRefreshKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}

export default App;
