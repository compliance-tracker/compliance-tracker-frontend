import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Download, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/TableRowsSkeleton";
import { api, ApiRequestError } from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { Business } from "@/lib/types";

interface BusinessListProps {
  businesses: Business[];
  loading?: boolean;
  // Optional - only BusinessesPage (the one place bulk delete makes sense) passes this. Every
  // other BusinessList render site (there isn't one currently, but the prop stays optional
  // rather than required) just won't get a Delete bulk action.
  onDeleted?: (businessId: number) => void;
}

type GstFilter = "all" | "registered" | "not-registered";
type SortField = "name" | "financialYearEnd";

const BUSINESS_COLUMNS = [
  { header: "Name", value: (b: Business) => b.name },
  { header: "Financial Year End", value: (b: Business) => b.financialYearEnd },
  { header: "GST Registered", value: (b: Business) => (b.gstRegistered ? "Yes" : "No") },
  { header: "Reminder Lead (days)", value: (b: Business) => b.leadTimeDays },
];

export function BusinessList({ businesses, loading = false, onDeleted }: BusinessListProps) {
  const [query, setQuery] = useState("");
  const [gstFilter, setGstFilter] = useState<GstFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAscending, setSortAscending] = useState(true);
  // Issue #35 - bulk select. IDs, not row objects - stays correct across a search/sort/filter
  // re-render (a selected business scrolling out of the visible/filtered set doesn't lose its
  // selection, matching how a real file manager's multi-select survives scrolling).
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Search/sort/filter over whatever's already in memory - the full list is small enough
  // (one SME's own businesses, not a multi-tenant global list) that there's no need to push
  // this to the backend as query params, unlike a real paginated API would need.
  const visibleBusinesses = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();

    const filtered = businesses.filter((b) => {
      const matchesQuery = lowerQuery === "" || b.name.toLowerCase().includes(lowerQuery);
      const matchesGst =
        gstFilter === "all" ||
        (gstFilter === "registered" ? b.gstRegistered : !b.gstRegistered);
      return matchesQuery && matchesGst;
    });

    const sorted = [...filtered].sort((a, b) => {
      const result =
        sortField === "name"
          ? a.name.localeCompare(b.name)
          : a.financialYearEnd.localeCompare(b.financialYearEnd);
      return sortAscending ? result : -result;
    });

    return sorted;
  }, [businesses, query, gstFilter, sortField, sortAscending]);

  const selectedVisible = visibleBusinesses.filter((b) => selected.has(b.id));
  const allVisibleSelected = visibleBusinesses.length > 0 && selectedVisible.length === visibleBusinesses.length;
  const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected;

  function toggleOne(businessId: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(businessId);
      else next.delete(businessId);
      return next;
    });
  }

  // Selects/deselects only the currently *visible* (filtered) rows - toggling "all" while a
  // search is active shouldn't reach into rows the user can't currently see.
  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const b of visibleBusinesses) {
        if (checked) next.add(b.id);
        else next.delete(b.id);
      }
      return next;
    });
  }

  // Issue #27 - exports whatever's currently visible (respecting the search/GST filter above),
  // not the full unfiltered list - if you've filtered down to "GST-registered businesses only",
  // that's almost certainly what you actually want in the file, not everything regardless of
  // what's on screen.
  function handleExport() {
    downloadCsv("businesses.csv", toCsv(visibleBusinesses, BUSINESS_COLUMNS));
  }

  // Issue #35 - exports only the selected rows, distinct from the whole-list export above -
  // shares the same toCsv columns/downloadCsv mechanics, just a different source list.
  function handleExportSelected() {
    downloadCsv("businesses.csv", toCsv(selectedVisible, BUSINESS_COLUMNS));
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    let deleted = 0;
    let failed = 0;

    // Sequential, same reasoning as ImportBusinessesDialog's bulk create (issue #28) - each
    // row's own outcome is independent, and staying sequential avoids firing a burst of
    // concurrent DELETEs for what's a background bulk operation, not a stress test.
    for (const business of selectedVisible) {
      try {
        await api.deleteBusiness(business.id);
        onDeleted?.(business.id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(business.id);
          return next;
        });
        deleted++;
      } catch (err) {
        failed++;
        const message = err instanceof ApiRequestError ? err.message : `Could not delete ${business.name}.`;
        toast.error(message);
      }
    }

    setBulkDeleting(false);
    setConfirmingBulkDelete(false);
    if (deleted > 0) {
      toast.success(failed > 0 ? `${deleted} of ${deleted + failed} businesses deleted` : `${deleted} businesses deleted`);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Businesses</CardTitle>
        {businesses.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download /> Export CSV
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Financial year end</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Reminder lead</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableRowsSkeleton columns={5} />
          </Table>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No businesses yet — add one to get started.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[10rem]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-8"
                  aria-label="Search businesses by name"
                />
              </div>

              <Select value={gstFilter} onValueChange={(v) => setGstFilter(v as GstFilter)}>
                <SelectTrigger aria-label="Filter by GST status">
                  <SelectValue placeholder="GST status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All businesses</SelectItem>
                  <SelectItem value="registered">GST-registered</SelectItem>
                  <SelectItem value="not-registered">Not GST-registered</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger aria-label="Sort by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by name</SelectItem>
                  <SelectItem value="financialYearEnd">Sort by FYE</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortAscending((prev) => !prev)}
                aria-label={sortAscending ? "Sort descending" : "Sort ascending"}
                title={sortAscending ? "Ascending" : "Descending"}
              >
                {sortAscending ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
              </Button>
            </div>

            {/* Issue #35 - only shown once at least one row is selected, so the list's normal
                layout is unaffected for anyone not using bulk actions at all. */}
            {selectedVisible.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium">
                  {selectedVisible.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportSelected}>
                    <Download /> Export selected
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmingBulkDelete(true)}>
                    <Trash2 /> Delete selected
                  </Button>
                </div>
              </div>
            )}

            {visibleBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No businesses match your search/filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                        aria-label="Select all businesses"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Financial year end</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Reminder lead</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBusinesses.map((b) => (
                    <TableRow key={b.id} data-state={selected.has(b.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(b.id)}
                          onCheckedChange={(checked) => toggleOne(b.id, checked === true)}
                          aria-label={`Select ${b.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="font-mono">{b.financialYearEnd}</TableCell>
                      <TableCell>
                        {b.gstRegistered ? (
                          <Badge>Registered</Badge>
                        ) : (
                          <Badge variant="outline">Not registered</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.leadTimeDays} days</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/businesses/${b.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={confirmingBulkDelete} onOpenChange={(open) => !bulkDeleting && setConfirmingBulkDelete(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedVisible.length} businesses?</DialogTitle>
            <DialogDescription>
              This permanently removes each selected business, its work passes, custom
              obligations, and all computed deadlines. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingBulkDelete(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Deleting..." : `Yes, delete ${selectedVisible.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
