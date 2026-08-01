import { useRef, useState } from "react";
import { CheckCircle2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
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
import { FormError } from "@/components/FormError";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiRequestError } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import type { Business, NewBusiness } from "@/lib/types";

interface ImportBusinessesDialogProps {
  onCreated: (business: Business) => void;
}

// A row's own line number in the source file (1-based, matching what a spreadsheet program
// would show, including the header row) - used only for error messages, so a user editing the
// file in Excel/Numbers can find the actual row that failed.
interface ParsedRow {
  line: number;
  data: NewBusiness | null;
  parseError: string | null;
}

// Case-insensitive, matched against the file's own header row rather than a fixed column order -
// more forgiving of a spreadsheet program reordering columns, and mirrors what BusinessList's own
// CSV export (issue #27) already names its columns, so a round-trip export-then-reimport works
// without editing headers by hand. Only Name/Financial Year End are required; the rest fall back
// to the same defaults AddBusinessDialog itself uses for an omitted field.
const REQUIRED_HEADERS = ["name", "financial year end"];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function parseYesNo(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "yes" || v === "true" || v === "1";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface ParseResult {
  rows: ParsedRow[];
  headerError: string | null;
}

function parseBusinessesCsv(content: string): ParseResult {
  const table = parseCsv(content).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (table.length === 0) {
    return { rows: [], headerError: "The file is empty." };
  }

  const header = table[0].map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      rows: [],
      headerError: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    };
  }

  const nameIdx = header.indexOf("name");
  const fyeIdx = header.indexOf("financial year end");
  const gstIdx = header.indexOf("gst registered");
  const leadIdx = header.indexOf("reminder lead (days)");
  const incorpIdx = header.indexOf("incorporation date");

  const rows: ParsedRow[] = table.slice(1).map((cols, i) => {
    const line = i + 2; // +1 for 0-index, +1 for the header row itself
    const name = (cols[nameIdx] ?? "").trim();
    const financialYearEnd = (cols[fyeIdx] ?? "").trim();

    if (!name || !financialYearEnd) {
      return { line, data: null, parseError: "Missing Name or Financial Year End." };
    }
    if (!ISO_DATE.test(financialYearEnd)) {
      return { line, data: null, parseError: `Financial Year End "${financialYearEnd}" must be YYYY-MM-DD.` };
    }

    const leadRaw = leadIdx >= 0 ? (cols[leadIdx] ?? "").trim() : "";
    const leadTimeDays = leadRaw ? Number(leadRaw) : 14;
    if (!Number.isInteger(leadTimeDays) || leadTimeDays < 1 || leadTimeDays > 90) {
      return { line, data: null, parseError: `Reminder lead "${leadRaw}" must be a whole number from 1 to 90.` };
    }

    const incorporationDate = incorpIdx >= 0 ? (cols[incorpIdx] ?? "").trim() : "";
    if (incorporationDate && !ISO_DATE.test(incorporationDate)) {
      return { line, data: null, parseError: `Incorporation date "${incorporationDate}" must be YYYY-MM-DD.` };
    }

    return {
      line,
      data: {
        name,
        financialYearEnd,
        gstRegistered: gstIdx >= 0 ? parseYesNo(cols[gstIdx] ?? "") : false,
        leadTimeDays,
        incorporationDate: incorporationDate || null,
      },
      parseError: null,
    };
  });

  return { rows, headerError: null };
}

type RowOutcome = "pending" | "created" | "failed";

// Issue #28 - a CSV counterpart to the single-business AddBusinessDialog, for someone managing
// many businesses at once (the issue's own example: an accounting firm's client list). No new
// backend endpoint - each valid row is just submitted through the existing single-business
// POST /api/businesses, one at a time, same as if it had been typed into the add form N times.
export function ImportBusinessesDialog({ onCreated }: ImportBusinessesDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Map<number, { outcome: RowOutcome; error?: string }>>(new Map());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setRows([]);
    setHeaderError(null);
    setOutcomes(new Map());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOutcomes(new Map());
    setFileName(file.name);
    const content = await file.text();
    const { rows: parsed, headerError: err } = parseBusinessesCsv(content);
    setRows(parsed);
    setHeaderError(err);
  }

  const validRows = rows.filter((r) => r.data !== null);

  async function handleImport() {
    setImporting(true);
    let created = 0;
    let failed = 0;

    // Sequential, not Promise.all - each row's own success/failure is shown as it resolves
    // (rather than everything appearing at once at the end), and staying sequential avoids
    // firing a burst of concurrent requests at the backend's own login-rate-limit-adjacent
    // infrastructure for what's meant to be a bulk *background* operation, not a stress test.
    for (const row of validRows) {
      if (!row.data) continue;
      setOutcomes((prev) => new Map(prev).set(row.line, { outcome: "pending" }));
      try {
        const business = await api.createBusiness(row.data);
        onCreated(business);
        setOutcomes((prev) => new Map(prev).set(row.line, { outcome: "created" }));
        created++;
      } catch (err) {
        const message = err instanceof ApiRequestError ? err.message : "Could not create this business.";
        setOutcomes((prev) => new Map(prev).set(row.line, { outcome: "failed", error: message }));
        failed++;
      }
    }

    setImporting(false);
    if (created > 0) {
      toast.success(failed > 0 ? `${created} of ${validRows.length} businesses imported` : `${created} businesses imported`);
    }
    if (failed === 0 && created > 0) {
      setOpen(false);
      reset();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import businesses from CSV</DialogTitle>
          <DialogDescription>
            A header row plus one row per business. Required columns: Name, Financial Year End
            (YYYY-MM-DD). Optional: GST Registered (Yes/No), Reminder Lead (days), Incorporation
            Date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />

          {headerError && <FormError>{headerError}</FormError>}

          {rows.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const outcome = outcomes.get(row.line);
                    return (
                      <TableRow key={row.line}>
                        <TableCell className="font-mono text-xs">{row.line}</TableCell>
                        <TableCell>{row.data?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {row.parseError ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> {row.parseError}
                            </span>
                          ) : outcome?.outcome === "created" ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Imported
                            </span>
                          ) : outcome?.outcome === "failed" ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> {outcome.error}
                            </span>
                          ) : outcome?.outcome === "pending" ? (
                            "Importing..."
                          ) : (
                            "Ready"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {fileName && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {validRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"} in {fileName} ready to import.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
          >
            {importing ? "Importing..." : `Import ${validRows.length || ""} business${validRows.length === 1 ? "" : "es"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
