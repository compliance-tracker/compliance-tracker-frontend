import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysUntil, deadlineLabel, urgencyClasses, urgencyLabel } from "./urgency";

// daysUntil() parses its dueDate string as UTC midnight (new Date("2026-07-27") does that),
// then normalizes both it and "now" to *local* midnight before comparing. That combination is
// timezone-sensitive: which calendar day UTC midnight lands on locally depends on the runner's
// offset. Pinning the system clock to local noon (vi.setSystemTime) - as far from any midnight
// boundary as possible - keeps every date comparison below stable regardless of what timezone
// this test suite happens to run in (a real, if latent, edge case worth being deliberate about
// rather than accidentally depending on).
const FIXED_TODAY = new Date(2026, 6, 27, 12, 0, 0); // 2026-07-27, local noon (month is 0-indexed)

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDateDaysFromToday(days: number): string {
  const d = new Date(FIXED_TODAY);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("daysUntil", () => {
  it("returns 0 for today", () => {
    expect(daysUntil(isoDateDaysFromToday(0))).toBe(0);
  });

  it("returns a positive number of days for a future date", () => {
    expect(daysUntil(isoDateDaysFromToday(10))).toBe(10);
  });

  it("returns a negative number of days for a past (overdue) date", () => {
    expect(daysUntil(isoDateDaysFromToday(-5))).toBe(-5);
  });
});

describe("urgencyClasses", () => {
  it("is the destructive (red) tier at exactly the 30-day boundary", () => {
    expect(urgencyClasses(30)).toContain("destructive");
  });

  it("is the destructive (red) tier for overdue dates", () => {
    expect(urgencyClasses(-1)).toContain("destructive");
  });

  it("is the amber tier just past 30 days", () => {
    const classes = urgencyClasses(31);
    expect(classes).not.toContain("destructive");
    expect(classes).toContain("amber");
  });

  it("is the amber tier at exactly the 90-day boundary", () => {
    expect(urgencyClasses(90)).toContain("amber");
  });

  it("is the neutral tier just past 90 days", () => {
    const classes = urgencyClasses(91);
    expect(classes).not.toContain("amber");
    expect(classes).not.toContain("destructive");
    expect(classes).toContain("muted");
  });
});

describe("urgencyLabel", () => {
  it("says 'Due today' for 0 days", () => {
    expect(urgencyLabel(0)).toBe("Due today");
  });

  it("says 'Xd left' for a future date", () => {
    expect(urgencyLabel(15)).toBe("15d left");
  });

  it("says 'Xd overdue' for a past date, without a leading minus sign", () => {
    expect(urgencyLabel(-7)).toBe("7d overdue");
  });
});

describe("deadlineLabel (issue #77 / #26)", () => {
  it("uses the fixed label for a built-in obligation type", () => {
    expect(deadlineLabel({ obligationType: "GST_F5" })).toBe("GST F5 Filing");
  });

  it("uses the deadline's own customName for a CUSTOM obligation, not a generic label", () => {
    expect(deadlineLabel({ obligationType: "CUSTOM", customName: "Renew business insurance" })).toBe(
      "Renew business insurance",
    );
  });

  it("falls back to a generic label if a CUSTOM deadline somehow has no customName", () => {
    expect(deadlineLabel({ obligationType: "CUSTOM" })).toBe("Custom obligation");
  });
});
