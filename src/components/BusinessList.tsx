import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Business } from "@/lib/types";

interface BusinessListProps {
  businesses: Business[];
}

type GstFilter = "all" | "registered" | "not-registered";
type SortField = "name" | "financialYearEnd";

export function BusinessList({ businesses }: BusinessListProps) {
  const [query, setQuery] = useState("");
  const [gstFilter, setGstFilter] = useState<GstFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAscending, setSortAscending] = useState(true);

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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Businesses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {businesses.length === 0 ? (
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

            {visibleBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No businesses match your search/filter.</p>
            ) : (
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
                <TableBody>
                  {visibleBusinesses.map((b) => (
                    <TableRow key={b.id}>
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
    </Card>
  );
}
