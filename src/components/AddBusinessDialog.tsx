import { useState } from "react";
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
import { api } from "@/lib/api";
import type { Business } from "@/lib/types";

interface AddBusinessDialogProps {
  onCreated: (business: Business) => void;
}

export function AddBusinessDialog({ onCreated }: AddBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [financialYearEnd, setFinancialYearEnd] = useState("");
  const [gstRegistered, setGstRegistered] = useState(false);
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await api.createBusiness({
        name,
        financialYearEnd,
        gstRegistered,
        leadTimeDays: Number(leadTimeDays),
      });
      onCreated(created);
      setOpen(false);
      setName("");
      setFinancialYearEnd("");
      setGstRegistered(false);
      setLeadTimeDays("14");
    } catch {
      setError("Could not create business. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add business</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a business</DialogTitle>
            <DialogDescription>
              Compliance deadlines will be computed from these details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test Cafe Pte Ltd"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fye">Financial year end</Label>
              <Input
                id="fye"
                type="date"
                value={financialYearEnd}
                onChange={(e) => setFinancialYearEnd(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="gst"
                checked={gstRegistered}
                onCheckedChange={(checked) => setGstRegistered(checked === true)}
              />
              <Label htmlFor="gst">GST registered</Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-time">Reminder lead time (days)</Label>
              <Input
                id="lead-time"
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add business"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
