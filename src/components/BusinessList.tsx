import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditBusinessDialog } from "@/components/EditBusinessDialog";
import { DeleteBusinessDialog } from "@/components/DeleteBusinessDialog";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BusinessListProps {
  businesses: Business[];
  selectedId: number | null;
  onSelect: (business: Business) => void;
  onUpdated: (business: Business) => void;
  onDeleted: (businessId: number) => void;
}

export function BusinessList({ businesses, selectedId, onSelect, onUpdated, onDeleted }: BusinessListProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Businesses</CardTitle>
      </CardHeader>
      <CardContent>
        {businesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No businesses yet — add one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Financial year end</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((b) => (
                <TableRow
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    selectedId === b.id && "bg-primary/10 hover:bg-primary/15"
                  )}
                >
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.financialYearEnd}</TableCell>
                  <TableCell>
                    {b.gstRegistered ? (
                      <Badge>Registered</Badge>
                    ) : (
                      <Badge variant="outline">Not registered</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <EditBusinessDialog business={b} onUpdated={onUpdated} />
                      <DeleteBusinessDialog business={b} onDeleted={onDeleted} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
