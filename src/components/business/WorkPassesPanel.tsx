import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/FormError";
import { TableRowsSkeleton } from "@/components/TableRowsSkeleton";
import { UrgencyBadge } from "@/components/UrgencyBadge";
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
import { toast } from "sonner";
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
  // The work pass pending a delete confirmation, if any - a click on the trash icon opens this
  // instead of deleting immediately (issue #24), matching the same confirm-before-destroying
  // pattern DeleteBusinessDialog already uses for a whole business.
  const [pendingDelete, setPendingDelete] = useState<WorkPass | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.success(`Work pass added for ${created.employeeName}`);
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
    setDeleting(true);
    const previous = workPasses;
    const removed = previous.find((p) => p.id === workPassId);
    // Optimistic removal - the row disappears immediately rather than waiting on the network,
    // since a delete has nothing meaningful to show while pending. Rolled back below if the
    // request actually fails, rather than leaving the UI showing a pass that's still there.
    setWorkPasses((prev) => prev.filter((p) => p.id !== workPassId));

    try {
      await api.deleteWorkPass(business.id, workPassId);
      onWorkPassesChanged?.();
      toast.success(removed ? `${removed.employeeName}'s work pass removed` : "Work pass removed");
    } catch (err) {
      setWorkPasses(previous);
      setError(err instanceof ApiRequestError ? err.message : "Could not remove work pass. Is the backend running?");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
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

                {error && <FormError>{error}</FormError>}
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
        {error && !dialogOpen && <FormError>{error}</FormError>}
        {!loading && workPasses.length === 0 ? (
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
            {loading ? (
              <TableRowsSkeleton columns={4} />
            ) : (
              <TableBody>
                {workPasses.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employeeName}</TableCell>
                    <TableCell className="font-mono">{p.expiryDate}</TableCell>
                    <TableCell>
                      <UrgencyBadge dueDate={p.expiryDate} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        onClick={() => setPendingDelete(p)}
                        aria-label={`Remove ${p.employeeName}'s work pass`}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </CardContent>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.employeeName}'s work pass?</DialogTitle>
            <DialogDescription>
              This permanently removes the work pass and its renewal deadline. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete.id)}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Yes, remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
