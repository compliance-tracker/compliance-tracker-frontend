import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DeadlinesPanel } from "@/components/DeadlinesPanel";
import { WorkPassesPanel } from "@/components/WorkPassesPanel";
import type { ShellContext } from "@/components/Shell";

// The "Work passes" page reached from the nav rail's "Selected business" section (issue #61) -
// also shows this business's deadlines above the work-passes table. The redesigned IA (see
// design-handoff.md, NOTES.md §4p) doesn't have a separate per-business deadlines page of its
// own - cross-business deadlines live in Calendar (a later step), so folding deadlines in here
// keeps that real, already-built functionality (DeadlinesPanel) somewhere rather than dropping
// it just because the mockup's nav only names this "Work passes."
export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businesses, loading } = useOutletContext<ShellContext>();
  const [deadlinesRefreshKey, setDeadlinesRefreshKey] = useState(0);

  const business = businesses.find((b) => b.id === Number(id)) ?? null;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!business) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Business not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/businesses">Back to businesses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{business.name}</h1>
        <p className="text-sm text-muted-foreground">
          Employment passes and upcoming compliance deadlines for this business.
        </p>
      </div>

      <DeadlinesPanel business={business} refreshKey={deadlinesRefreshKey} />
      <WorkPassesPanel business={business} onWorkPassesChanged={() => setDeadlinesRefreshKey((k) => k + 1)} />
    </div>
  );
}
