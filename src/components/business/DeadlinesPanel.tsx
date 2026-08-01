import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintHeader } from "@/components/PrintHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/TableRowsSkeleton";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { api } from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { deadlineLabel } from "@/lib/urgency";
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

  // Issue #27 - handing this to an accountant/company secretary is the whole point of the
  // feature, so the filename identifies which business it's for rather than a generic
  // "deadlines.csv" that's ambiguous the moment you have more than one export sitting around.
  // Non-alphanumeric characters replaced with "-" since a business name can contain slashes,
  // punctuation, etc. that aren't safe in a filename.
  function handleExport() {
    if (!business) return;
    const csv = toCsv(deadlines, [
      { header: "Obligation", value: (d) => deadlineLabel(d) },
      { header: "Due Date", value: (d) => d.dueDate },
    ]);
    const safeName = business.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`${safeName}-deadlines.csv`, csv);
  }

  return (
    <Card className="shadow-sm print:border-0 print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 print:hidden">
        <CardTitle>{business.name} — upcoming deadlines</CardTitle>
        {deadlines.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download /> Export CSV
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <PrintHeader title={`${business.name} — upcoming deadlines`} />
        {!loading && deadlines.length === 0 ? (
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
            {loading ? (
              <TableRowsSkeleton columns={3} />
            ) : (
              <TableBody>
                {deadlines.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="secondary">{deadlineLabel(d)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{d.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <UrgencyBadge dueDate={d.dueDate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
