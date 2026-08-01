import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CustomObligationsPanel } from "@/components/business/CustomObligationsPanel";
import { DeadlinesPanel } from "@/components/business/DeadlinesPanel";
import { PageSkeleton } from "@/components/PageSkeleton";
import { WorkPassesPanel } from "@/components/business/WorkPassesPanel";
import type { ShellContext } from "@/components/shell/Shell";

// The "Overview" page reached from the nav rail's "Selected business" section (issue #61) - shows
// this business's deadlines above its work-passes table. The redesigned IA (see
// design-handoff.md, NOTES.md §4p) doesn't have a separate per-business deadlines page of its
// own - cross-business deadlines live in Calendar - so folding deadlines in here keeps that real,
// already-built functionality (DeadlinesPanel) somewhere rather than dropping it just because the
// mockup's nav only named the equivalent link "Work passes." Renamed to "Overview" (issue #65)
// once that original label turned out to undersell what the page actually shows.
export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businesses, loading } = useOutletContext<ShellContext>();
  const [deadlinesRefreshKey, setDeadlinesRefreshKey] = useState(0);

  const business = businesses.find((b) => b.id === Number(id)) ?? null;

  if (loading) {
    return <PageSkeleton cards={3} />;
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
      <div className="border-b border-border pb-4 print:hidden">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{business.name}</h1>
        <p className="text-sm text-muted-foreground">
          Employment passes, custom obligations, and upcoming compliance deadlines for this business.
        </p>
      </div>

      <DeadlinesPanel business={business} refreshKey={deadlinesRefreshKey} />
      {/* Issue #36 - only the deadlines list is meant to be a printable document; work passes
          and custom obligations stay screen-only, hidden here at the page-composition level
          rather than inside the panels themselves, since neither is a reusable "this shouldn't
          print" fact about WorkPassesPanel/CustomObligationsPanel in general. */}
      <div className="space-y-6 print:hidden">
        <WorkPassesPanel business={business} onWorkPassesChanged={() => setDeadlinesRefreshKey((k) => k + 1)} />
        <CustomObligationsPanel
          business={business}
          onCustomObligationsChanged={() => setDeadlinesRefreshKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
