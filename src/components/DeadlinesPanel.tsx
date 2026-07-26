import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Business, Deadline } from "@/lib/types";

const OBLIGATION_LABELS: Record<string, string> = {
  ACRA_ANNUAL_RETURN: "ACRA Annual Return",
  GST_F5: "GST F5 Filing",
  WORK_PASS_RENEWAL: "Work Pass Renewal",
};

function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Urgency has to be visible at a glance - a deadline in 5 days should not look identical to one
// in a year. Three tiers: overdue/soon (red), coming up within a quarter (amber), everything
// else (neutral).
function urgencyClasses(days: number): string {
  if (days <= 30) return "bg-destructive/10 text-destructive";
  if (days <= 90) return "bg-amber-500/10 text-amber-700 dark:text-amber-500";
  return "bg-muted text-muted-foreground";
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

interface DeadlinesPanelProps {
  business: Business | null;
  // Deadlines depend on the business's work passes too (WORK_PASS_RENEWAL, one per pass), but
  // adding/removing a pass doesn't change the `business` object itself - bumping this from the
  // parent after a work pass change is what tells this effect to refetch.
  refreshKey?: number;
}

export function DeadlinesPanel({ business, refreshKey }: DeadlinesPanelProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!business) {
      setDeadlines([]);
      return;
    }

    setLoading(true);
    api
      .getDeadlines(business.id)
      .then(setDeadlines)
      .finally(() => setLoading(false));
  }, [business, refreshKey]);

  if (!business) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Select a business to see its upcoming compliance deadlines.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{business.name} — upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deadlines computed for this business.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obligation</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d, i) => {
                const days = daysUntil(d.dueDate);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="secondary">
                        {OBLIGATION_LABELS[d.obligationType] ?? d.obligationType}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={cn(urgencyClasses(days))}>{urgencyLabel(days)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
