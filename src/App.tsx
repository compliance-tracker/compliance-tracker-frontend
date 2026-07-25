import { useEffect, useState } from "react";
import { AddBusinessDialog } from "@/components/AddBusinessDialog";
import { BusinessList } from "@/components/BusinessList";
import { api } from "@/lib/api";
import type { Business } from "@/lib/types";

function App() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBusinesses()
      .then(setBusinesses)
      .catch(() => setError("Could not reach the backend. Is it running on port 8081?"));
  }, []);

  function handleCreated(business: Business) {
    setBusinesses((prev) => [...prev, business]);
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
        <AddBusinessDialog onCreated={handleCreated} />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <BusinessList businesses={businesses} selectedId={selected?.id ?? null} onSelect={setSelected} />
    </div>
  );
}

export default App;
