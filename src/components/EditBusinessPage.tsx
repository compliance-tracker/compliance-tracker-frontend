import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteBusinessDialog } from "@/components/DeleteBusinessDialog";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiRequestError } from "@/lib/api";
import type { ShellContext } from "@/components/Shell";
import type { Business } from "@/lib/types";

// A full page (issue #61), replacing the old EditBusinessDialog modal - same fields, same
// ApiRequestError handling, just reached via the nav rail instead of a per-row icon button. The
// danger-zone delete (previously its own icon button next to Edit in BusinessList) now lives
// here too, matching the mockup's Edit Business page exactly.
export function EditBusinessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { businesses, loading, onUpdated, onDeleted } = useOutletContext<ShellContext>();
  const business = businesses.find((b) => b.id === Number(id)) ?? null;

  return (
    <EditBusinessForm
      key={business?.id}
      loading={loading}
      business={business}
      onUpdated={onUpdated}
      onDeleted={(businessId) => {
        onDeleted(businessId);
        navigate("/businesses");
      }}
    />
  );
}

interface EditBusinessFormProps {
  loading: boolean;
  business: Business | null;
  onUpdated: ShellContext["onUpdated"];
  onDeleted: (businessId: number) => void;
}

function EditBusinessForm({ loading, business, onUpdated, onDeleted }: EditBusinessFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(business?.name ?? "");
  const [financialYearEnd, setFinancialYearEnd] = useState(business?.financialYearEnd ?? "");
  const [gstRegistered, setGstRegistered] = useState(business?.gstRegistered ?? false);
  const [leadTimeDays, setLeadTimeDays] = useState(String(business?.leadTimeDays ?? 14));
  const [incorporationDate, setIncorporationDate] = useState(business?.incorporationDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!business) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Business not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/businesses")}>
          Back to businesses
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
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
      navigate(`/businesses/${business.id}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update business. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Edit business</h1>
        <p className="text-sm text-muted-foreground">Update {business.name}'s details, or remove it entirely.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Business name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="flex items-end pb-2.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-gst"
                    checked={gstRegistered}
                    onCheckedChange={(checked) => setGstRegistered(checked === true)}
                  />
                  <Label htmlFor="edit-gst">GST registered</Label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            {error && <FormError>{error}</FormError>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-destructive bg-destructive/10 p-5">
        <h3 className="text-sm font-semibold text-destructive">Delete this business</h3>
        <p className="mt-1 mb-3.5 max-w-[60ch] text-sm text-foreground/85">
          Permanently removes {business.name}, its work passes, and all computed deadlines. You'll be
          asked to confirm — this can't be undone.
        </p>
        <DeleteBusinessDialog business={business} onDeleted={onDeleted} />
      </div>
    </div>
  );
}
