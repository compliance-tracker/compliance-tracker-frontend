// Issue #27 - CSV export. No library dependency needed for something this small: a CSV file is
// just comma-separated text with one escaping rule to get right (see escapeCsvField below), and
// triggering a browser download from already-in-memory data is a handful of DOM APIs, not
// anything a library meaningfully simplifies.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

// RFC 4180's actual rule: a field only needs quoting if it contains a comma, a quote, or a
// newline - quoting every field unconditionally would still be valid CSV, but noisier to read
// than necessary for the common case (most fields here are plain dates/names with none of these).
// A literal quote inside a quoted field is escaped by doubling it ("" ), not backslash-escaped -
// backslash has no special meaning in CSV at all.
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(c.value(row))).join(","));
  // CRLF (\r\n), not just \n - the actual line-ending RFC 4180 specifies, and what makes a CSV
  // opened directly in Excel on Windows render cleanly rather than occasionally showing every
  // row's line ending as a literal character.
  return [header, ...lines].join("\r\n");
}

// Issue #28 - bulk CSV import (businesses). A real RFC 4180 parser, not a naive line.split(",") -
// that would break on the exact fields toCsv above deliberately quotes: a name containing a
// comma, an embedded quote, or a newline. Handles doubled-quote escaping and both CRLF/LF line
// endings (a file edited in a plain text editor, not just Excel's own export, might use either).
// Returns raw string[][] (one array per row, header row included) - column meaning is the
// caller's job, same separation toCsv already has (generic CSV mechanics vs. business-specific
// column shape).
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (char === "\r") {
      i++; // bare CR ignored - the following \n (CRLF) or a lone CR both end up here
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += char;
      i++;
    }
  }

  // The last row has no trailing newline to trigger the push above - flush whatever's left,
  // but only if there's actually something there (avoids one spurious empty row from a file
  // that *does* end with a trailing newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// Real browser download, not a data: URL - createObjectURL keeps the whole (potentially large)
// CSV content out of the URL string itself, and revokeObjectURL afterward is what stops the
// blob's memory from leaking for the rest of the page's lifetime once the download has started.
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
