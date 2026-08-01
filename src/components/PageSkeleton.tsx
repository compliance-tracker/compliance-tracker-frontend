import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  // How many card-shaped placeholder blocks to show below the title - matches roughly how many
  // real cards the page is about to render (e.g. 3 for BusinessDetailPage's deadlines/work-passes/
  // custom-obligations panels, 1 for EditBusinessPage's single form card).
  cards?: number;
}

// Issue #29 - the shared shape for "this whole page hasn't loaded yet" (distinct from
// TableRowsSkeleton, which is for a single table still loading *within* an already-rendered
// page). Used by BusinessDetailPage/EditBusinessPage while ShellContext's own businesses fetch is
// still in flight, before there's a real business to render anything about yet.
export function PageSkeleton({ cards = 1 }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {Array.from({ length: cards }, (_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
