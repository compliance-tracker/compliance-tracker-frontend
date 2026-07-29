import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiRequestError } from "@/lib/api";
import type { Business } from "@/lib/types";

interface EditBusinessDialogProps {
  business: Business;
  onUpdated: (business: Business) => void;
}

export function EditBusinessDialog({ business, onUpdated }: EditBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(business.name);
  const [financialYearEnd, setFinancialYearEnd] = useState(business.financialYearEnd);
  const [gstRegistered, setGstRegistered] = useState(business.gstRegistered);
  const [leadTimeDays, setLeadTimeDays] = useState(String(business.leadTimeDays));
  const [incorporationDate, setIncorporationDate] = useState(business.incorporationDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync fields to this business's current values every time the dialog opens - otherwise a
  // previous edit (submitted or abandoned) would linger the next time it's reopened.
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(business.name);
      setFinancialYearEnd(business.financialYearEnd);
      setGstRegistered(business.gstRegistered);
      setLeadTimeDays(String(business.leadTimeDays));
      setIncorporationDate(business.incorporationDate ?? "");
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updated = await api.updateBusiness(business.id, {
        name,
        financialYearEnd,
        gstRegistered,
        leadTimeDays: Number(leadTimeDays),
        incorporationDate: incorporationDate || null,
      });
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update business. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* stopPropagation - this button sits inside a BusinessList row that selects the
            business on click; without this, opening the edit dialog would also select it. */}
        <Button
          size="icon-sm"
          variant="outline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Edit ${business.name}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit business</DialogTitle>
            <DialogDescription>Update {business.name}'s details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Business name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fye">Financial year end</Label>
              <Input
                id="edit-fye"
                type="date"
                value={financialYearEnd}
                onChange={(e) => setFinancialYearEnd(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-gst"
                checked={gstRegistered}
                onCheckedChange={(checked) => setGstRegistered(checked === true)}
              />
              <Label htmlFor="edit-gst">GST registered</Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-lead-time">Reminder lead time (days)</Label>
              <Input
                id="edit-lead-time"
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-incorporation-date">Incorporation date (optional)</Label>
              <Input
                id="edit-incorporation-date"
                type="date"
                value={incorporationDate}
                onChange={(e) => setIncorporationDate(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
