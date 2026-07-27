import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { api } from "@/lib/api";
import type { Business } from "@/lib/types";

interface DeleteBusinessDialogProps {
  business: Business;
  onDeleted: (businessId: number) => void;
}

export function DeleteBusinessDialog({ business, onDeleted }: DeleteBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await api.deleteBusiness(business.id);
      onDeleted(business.id);
      setOpen(false);
    } catch {
      setError("Could not delete business. Is the backend running?");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* stopPropagation - see EditBusinessDialog for why this matters inside a table row. */}
        <Button
          size="icon-sm"
          variant="destructive"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Delete ${business.name}`}
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {business.name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the business, its work passes, and all computed deadlines.
            This can't be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
