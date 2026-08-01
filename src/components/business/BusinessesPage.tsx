import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { AddBusinessDialog } from "@/components/business/AddBusinessDialog";
import { BusinessList } from "@/components/business/BusinessList";
import { StatCard, StatCardSkeleton } from "@/components/shell/StatCard";
import type { ShellContext } from "@/components/shell/Shell";

// The top-level "Businesses" page (issue #61) - what main.tsx's App used to render inline as
// the whole dashboard. The stat tiles + business table now live here specifically, not the
// shell, since they're about this one page, not every routed page.
export function BusinessesPage() {
  const { businesses, loading, onCreated } = useOutletContext<ShellContext>();
  const gstRegisteredCount = businesses.filter((b) => b.gstRegistered).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            Every business you're tracking compliance deadlines for.
          </p>
        </div>
        <AddBusinessDialog onCreated={onCreated} />
      </div>

      {/* Issue #29 - this page previously had no loading state at all (not even plain text),
          the count tiles/table would just flash 0/empty then correct themselves once the
          businesses fetch resolved. */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Businesses tracked" value={businesses.length} icon={Building2} />
          <StatCard label="GST-registered" value={gstRegisteredCount} icon={CheckCircle2} />
          <StatCard label="Not GST-registered" value={businesses.length - gstRegisteredCount} icon={XCircle} />
        </div>
      )}

      <BusinessList businesses={businesses} loading={loading} />
    </div>
  );
}
