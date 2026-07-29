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
import { api, ApiRequestError } from "@/lib/api";
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
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete business. Is the backend running?");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Rendered from EditBusinessPage's danger zone (issue #61) - a full labeled button, not
          the icon-only trigger this used when it lived inline in a BusinessList row. */}
      <DialogTrigger asChild>
        <Button variant="destructive">Delete business</Button>
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
