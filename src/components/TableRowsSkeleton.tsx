import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableRowsSkeletonProps {
  columns: number;
  rows?: number;
}

// Issue #29 - shared by every panel that shows a shadcn Table while its own data is still
// loading (DeadlinesPanel, WorkPassesPanel, CustomObligationsPanel) - all three used to just show
// plain "Loading..." text instead of anything shaped like the table about to appear. Bar widths
// vary slightly (60-95%) so the rows read as placeholder content, not a literal grid of identical
// blocks - purely cosmetic, not meant to mimic any specific column's real content type.
const BAR_WIDTHS = ["w-3/4", "w-1/2", "w-5/6", "w-2/3", "w-full", "w-3/5"];

export function TableRowsSkeleton({ columns, rows = 3 }: TableRowsSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className={`h-4 ${BAR_WIDTHS[(rowIndex + colIndex) % BAR_WIDTHS.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
