import type { ObligationType } from "./types";

// Shared by DeadlinesPanel, WorkPassesPanel, and CalendarPage - all need "how many days until
// this date, and how urgent does that look" for their own dates (a compliance deadline, a work
// pass expiry). Kept in one place so the red/amber/neutral thresholds can't drift apart.

// Human-readable obligation names, moved here from DeadlinesPanel (issue #63) once CalendarPage
// needed the same mapping - kept with the other deadline-display helpers rather than duplicated.
export const OBLIGATION_LABELS: Record<ObligationType, string> = {
  ACRA_ANNUAL_RETURN: "ACRA Annual Return",
  GST_F5: "GST F5 Filing",
  WORK_PASS_RENEWAL: "Work Pass Renewal",
};

export function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Urgency has to be visible at a glance - a deadline in 5 days should not look identical to one
// in a year. Three tiers: overdue/soon (red), coming up within a quarter (amber), everything
// else (neutral).
export function urgencyClasses(days: number): string {
  // font-mono - these badges carry a figure ("18d left"), unlike a plain status/prose badge
  // (e.g. "Registered"), so the number reads as measured rather than looking oddly technical
  // applied everywhere (Harbour Ledger, issue #59).
  if (days <= 30) return "bg-destructive/10 text-destructive font-mono";
  if (days <= 90) return "bg-amber/14 text-amber font-mono";
  return "bg-muted text-muted-foreground font-mono";
}

export function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export type UrgencyTier = "high" | "med" | "low";

// Same three thresholds as urgencyClasses, as a plain tier name - CalendarPage's day-dots (issue
// #63) need to pick a dot color, not a badge's Tailwind classes.
export function urgencyTier(days: number): UrgencyTier {
  if (days <= 30) return "high";
  if (days <= 90) return "med";
  return "low";
}
