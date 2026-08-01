import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, parseCsv, toCsv } from "./csv";

interface Row {
  name: string;
  date: string;
  count: number;
}

describe("toCsv", () => {
  it("writes a header row followed by one row per item", () => {
    const rows: Row[] = [
      { name: "Alpha", date: "2026-12-31", count: 3 },
      { name: "Beta", date: "2026-06-30", count: 7 },
    ];

    const csv = toCsv(rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Date", value: (r) => r.date },
      { header: "Count", value: (r) => r.count },
    ]);

    expect(csv).toBe("Name,Date,Count\r\nAlpha,2026-12-31,3\r\nBeta,2026-06-30,7");
  });

  it("returns just the header for an empty list, not an error", () => {
    const csv = toCsv<Row>([], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toBe("Name");
  });

  it("wraps a field containing a comma in quotes", () => {
    const csv = toCsv([{ name: "Test Cafe, Pte Ltd", date: "", count: 0 }], [
      { header: "Name", value: (r) => r.name },
    ]);
    expect(csv).toBe('Name\r\n"Test Cafe, Pte Ltd"');
  });

  it("escapes a literal quote by doubling it, inside a quoted field", () => {
    const csv = toCsv([{ name: 'The "Best" Co', date: "", count: 0 }], [
      { header: "Name", value: (r) => r.name },
    ]);
    expect(csv).toBe('Name\r\n"The ""Best"" Co"');
  });

  it("wraps a field containing a newline in quotes", () => {
    const csv = toCsv([{ name: "Line one\nLine two", date: "", count: 0 }], [
      { header: "Name", value: (r) => r.name },
    ]);
    expect(csv).toBe('Name\r\n"Line one\nLine two"');
  });

  it("does not quote a plain field with none of those characters", () => {
    const csv = toCsv([{ name: "Plain Name", date: "2026-01-01", count: 1 }], [
      { header: "Name", value: (r) => r.name },
    ]);
    expect(csv).toBe("Name\r\nPlain Name");
  });
});

describe("parseCsv", () => {
  it("parses a header row plus data rows", () => {
    expect(parseCsv("Name,Date\r\nAlpha,2026-12-31\r\nBeta,2026-06-30")).toEqual([
      ["Name", "Date"],
      ["Alpha", "2026-12-31"],
      ["Beta", "2026-06-30"],
    ]);
  });

  it("handles a plain LF line ending, not just CRLF", () => {
    expect(parseCsv("Name\nAlpha\nBeta")).toEqual([["Name"], ["Alpha"], ["Beta"]]);
  });

  it("unquotes a field that was quoted because it contains a comma", () => {
    expect(parseCsv('Name\r\n"Test Cafe, Pte Ltd"')).toEqual([["Name"], ["Test Cafe, Pte Ltd"]]);
  });

  it("unescapes a doubled quote inside a quoted field", () => {
    expect(parseCsv('Name\r\n"The ""Best"" Co"')).toEqual([["Name"], ['The "Best" Co']]);
  });

  it("keeps a newline embedded inside a quoted field as part of that one field", () => {
    expect(parseCsv('Name\r\n"Line one\nLine two"')).toEqual([["Name"], ["Line one\nLine two"]]);
  });

  it("round-trips through toCsv - parsing what it just wrote reproduces the original rows", () => {
    const csv = toCsv(
      [{ name: "Test Cafe, Pte Ltd", date: 'The "Best" Co', count: 1 }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Date", value: (r) => r.date },
      ],
    );
    expect(parseCsv(csv)).toEqual([
      ["Name", "Date"],
      ["Test Cafe, Pte Ltd", 'The "Best" Co'],
    ]);
  });

  it("does not add a spurious trailing empty row for a file ending in a newline", () => {
    expect(parseCsv("Name\r\nAlpha\r\n")).toEqual([["Name"], ["Alpha"]]);
  });
});

describe("downloadCsv", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: () => void;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => "blob:mock-url");
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy });
    clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates an object URL, clicks a download link with the right filename, then revokes it", () => {
    downloadCsv("businesses.csv", "Name\r\nAlpha");

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("does not leave the temporary link element in the document afterward", () => {
    downloadCsv("businesses.csv", "Name\r\nAlpha");

    expect(document.querySelector('a[download="businesses.csv"]')).not.toBeInTheDocument();
  });
});
