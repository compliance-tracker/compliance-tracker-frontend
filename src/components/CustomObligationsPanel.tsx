import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Business, CustomObligation, NewCustomObligation } from "@/lib/types";

interface CustomObligationsPanelProps {
  business: Business | null;
  // Same reasoning as WorkPassesPanel's onWorkPassesChanged - adding/editing/removing a custom
  // obligation changes what DeadlinesPanel should show (a CUSTOM entry per obligation), and
  // DeadlinesPanel has no other way to know one changed.
  onCustomObligationsChanged?: () => void;
}

// Empty form state, shared by both the add and edit dialogs below - a plain object rather than
// one state variable per field, since both dialogs need to reset/prefill the exact same shape.
interface FormState {
  name: string;
  dueDate: string;
  repeats: boolean;
  recurrenceMonths: string;
}

const EMPTY_FORM: FormState = { name: "", dueDate: "", repeats: false, recurrenceMonths: "" };

function formStateFor(obligation: CustomObligation): FormState {
  return {
    name: obligation.name,
    dueDate: obligation.dueDate,
    repeats: obligation.recurrenceMonths !== null,
    recurrenceMonths: obligation.recurrenceMonths !== null ? String(obligation.recurrenceMonths) : "",
  };
}

function toRequest(form: FormState): NewCustomObligation {
  return {
    name: form.name,
    dueDate: form.dueDate,
    recurrenceMonths: form.repeats ? Number(form.recurrenceMonths) : null,
  };
}

function recurrenceLabel(obligation: CustomObligation): string {
  if (obligation.recurrenceMonths === null) return "One-off";
  return obligation.recurrenceMonths === 1 ? "Every month" : `Every ${obligation.recurrenceMonths} months`;
}

// The UI counterpart to backend issue #59 - a business's own user-defined compliance items
// beyond the 3 built-in ones (ACRA/GST/work pass), same panel pattern WorkPassesPanel already
// established (add dialog, table, delete-confirmation dialog), plus an edit dialog reusing the
// same form, since unlike a work pass a custom obligation's own fields are meant to be corrected
// in place, not just removed and re-added.
export function CustomObligationsPanel({ business, onCustomObligationsChanged }: CustomObligationsPanelProps) {
  const [obligations, setObligations] = useState<CustomObligation[]>([]);
  const [loading, setLoading] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CustomObligation | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<CustomObligation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) {
      setObligations([]);
      return;
    }

    setLoading(true);
    api
      .getCustomObligations(business.id)
      .then(setObligations)
      .finally(() => setLoading(false));
  }, [business]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;

    setAddSubmitting(true);
    setAddError(null);

    try {
      const created = await api.createCustomObligation(business.id, toRequest(addForm));
      setObligations((prev) => [...prev, created]);
      onCustomObligationsChanged?.();
      setAddDialogOpen(false);
      setAddForm(EMPTY_FORM);
    } catch (err) {
      setAddError(
        err instanceof ApiRequestError ? err.message : "Could not add custom obligation. Is the backend running?",
      );
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!business || !editing) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const updated = await api.updateCustomObligation(business.id, editing.id, toRequest(editForm));
      setObligations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      onCustomObligationsChanged?.();
      setEditing(null);
    } catch (err) {
      setEditError(
        err instanceof ApiRequestError ? err.message : "Could not update custom obligation. Is the backend running?",
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(obligationId: number) {
    if (!business) return;
    setListError(null);
    setDeleting(true);
    const previous = obligations;
    // Optimistic removal, rolled back on failure - same pattern WorkPassesPanel already
    // established (issue #52 found and fixed a real out-of-sync bug from skipping this once).
    setObligations((prev) => prev.filter((o) => o.id !== obligationId));

    try {
      await api.deleteCustomObligation(business.id, obligationId);
      onCustomObligationsChanged?.();
    } catch (err) {
      setObligations(previous);
      setListError(
        err instanceof ApiRequestError ? err.message : "Could not remove custom obligation. Is the backend running?",
      );
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  if (!business) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Select a business to manage its own compliance obligations.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{business.name} — custom obligations</CardTitle>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) setAddForm(EMPTY_FORM);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus /> Add obligation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add a custom obligation</DialogTitle>
                <DialogDescription>
                  Track something beyond ACRA, GST, and work passes - a one-off date, or something
                  that repeats every few months.
                </DialogDescription>
              </DialogHeader>
              <ObligationFormFields form={addForm} onChange={setAddForm} idPrefix="add" />
              {addError && <p className="px-1 pb-1 text-sm text-destructive">{addError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={addSubmitting}>
                  {addSubmitting ? "Adding..." : "Add obligation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {listError && <p className="text-sm text-destructive">{listError}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : obligations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom obligations yet — add one to track something beyond ACRA, GST, and work passes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Repeats</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.map((o) => {
                const days = daysUntil(o.dueDate);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="font-mono">{o.dueDate}</TableCell>
                    <TableCell className="text-muted-foreground">{recurrenceLabel(o)}</TableCell>
                    <TableCell>
                      <Badge className={cn(urgencyClasses(days))}>{urgencyLabel(days)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={() => {
                            setEditForm(formStateFor(o));
                            setEditError(null);
                            setEditing(o);
                          }}
                          aria-label={`Edit ${o.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          onClick={() => setPendingDelete(o)}
                          aria-label={`Remove ${o.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit {editing?.name}</DialogTitle>
              <DialogDescription>
                Any not-yet-reminded deadline computed from the old values is replaced with the
                new one.
              </DialogDescription>
            </DialogHeader>
            <ObligationFormFields form={editForm} onChange={setEditForm} idPrefix="edit" />
            {editError && <p className="px-1 pb-1 text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the obligation and its computed deadline. This can't be undone.
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

interface ObligationFormFieldsProps {
  form: FormState;
  onChange: (form: FormState) => void;
  idPrefix: string;
}

// Shared by both the add and edit dialogs - identical fields, only the ids differ (two dialogs
// can be mounted in the same DOM tree at once, so their input ids must not collide).
function ObligationFormFields({ form, onChange, idPrefix }: ObligationFormFieldsProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-obligation-name`}>Name</Label>
        <Input
          id={`${idPrefix}-obligation-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Renew business insurance"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-obligation-due-date`}>Due date</Label>
        <Input
          id={`${idPrefix}-obligation-due-date`}
          type="date"
          value={form.dueDate}
          onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-obligation-repeats`}
          checked={form.repeats}
          onCheckedChange={(checked) => onChange({ ...form, repeats: checked === true })}
        />
        <Label htmlFor={`${idPrefix}-obligation-repeats`}>Repeats</Label>
      </div>

      {form.repeats && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-obligation-recurrence-months`}>Every N months</Label>
          <Input
            id={`${idPrefix}-obligation-recurrence-months`}
            type="number"
            min={1}
            value={form.recurrenceMonths}
            onChange={(e) => onChange({ ...form, recurrenceMonths: e.target.value })}
            required
          />
        </div>
      )}
    </div>
  );
}
