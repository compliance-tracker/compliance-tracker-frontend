import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { daysUntil, deadlineLabel, urgencyClasses, urgencyLabel } from "@/lib/urgency";
import type { Business, Deadline } from "@/lib/types";

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
                      <Badge variant="secondary">{deadlineLabel(d)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{d.dueDate}</TableCell>
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
