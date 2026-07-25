import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Business, Deadline } from "@/lib/types";

const OBLIGATION_LABELS: Record<string, string> = {
  ACRA_ANNUAL_RETURN: "ACRA Annual Return",
  GST_F5: "GST F5 Filing",
  WORK_PASS_RENEWAL: "Work Pass Renewal",
};

interface DeadlinesPanelProps {
  business: Business | null;
}

export function DeadlinesPanel({ business }: DeadlinesPanelProps) {
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
  }, [business]);

  if (!business) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Select a business to see its upcoming compliance deadlines.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="secondary">
                      {OBLIGATION_LABELS[d.obligationType] ?? d.obligationType}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.dueDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
