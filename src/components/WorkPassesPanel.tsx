import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { daysUntil, urgencyClasses, urgencyLabel } from "@/lib/urgency";
import type { Business, WorkPass } from "@/lib/types";

interface WorkPassesPanelProps {
  business: Business | null;
  // Adding/removing a work pass changes what DeadlinesPanel should show (WORK_PASS_RENEWAL,
  // one deadline per pass) - this tells the parent to trigger that refetch, since DeadlinesPanel
  // has no other way to know a pass changed (the business object itself doesn't change).
  onWorkPassesChanged?: () => void;
}

export function WorkPassesPanel({ business, onWorkPassesChanged }: WorkPassesPanelProps) {
  const [workPasses, setWorkPasses] = useState<WorkPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) {
      setWorkPasses([]);
      return;
    }

    setLoading(true);
    api
      .getWorkPasses(business.id)
      .then(setWorkPasses)
      .finally(() => setLoading(false));
  }, [business]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await api.createWorkPass(business.id, { employeeName, expiryDate });
      setWorkPasses((prev) => [...prev, created]);
      onWorkPassesChanged?.();
      setDialogOpen(false);
      setEmployeeName("");
      setExpiryDate("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add work pass. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(workPassId: number) {
    if (!business) return;
    setError(null);
    const previous = workPasses;
    // Optimistic removal - the row disappears immediately rather than waiting on the network,
    // since a delete has nothing meaningful to show while pending. Rolled back below if the
    // request actually fails, rather than leaving the UI showing a pass that's still there.
    setWorkPasses((prev) => prev.filter((p) => p.id !== workPassId));

    try {
      await api.deleteWorkPass(business.id, workPassId);
      onWorkPassesChanged?.();
    } catch (err) {
      setWorkPasses(previous);
      setError(err instanceof ApiRequestError ? err.message : "Could not remove work pass. Is the backend running?");
    }
  }

  if (!business) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Select a business to manage its employees' work passes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{business.name} — work passes</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus /> Add work pass
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add a work pass</DialogTitle>
                <DialogDescription>
                  A renewal reminder will be computed from the expiry date.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employeeName">Employee name</Label>
                  <Input
                    id="employeeName"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add work pass"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Shown here (not just inside the add dialog above) since a delete failure - the
            other thing that sets `error` - happens with that dialog closed. */}
        {error && !dialogOpen && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : workPasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No work passes yet — add one to track its renewal deadline.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Expiry date</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workPasses.map((p) => {
                const days = daysUntil(p.expiryDate);
                return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employeeName}</TableCell>
                  <TableCell>{p.expiryDate}</TableCell>
                  <TableCell>
                    <Badge className={cn(urgencyClasses(days))}>{urgencyLabel(days)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => handleDelete(p.id)}
                      aria-label={`Remove ${p.employeeName}'s work pass`}
                    >
                      <Trash2 />
                    </Button>
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
