// Shared by DeadlinesPanel and WorkPassesPanel - both need "how many days until this date, and
// how urgent does that look" for their own dates (a compliance deadline, a work pass expiry).
// Kept in one place so the red/amber/neutral thresholds can't drift apart between the two.

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
  if (days <= 30) return "bg-destructive/10 text-destructive";
  if (days <= 90) return "bg-amber-500/10 text-amber-700 dark:text-amber-500";
  return "bg-muted text-muted-foreground";
}

export function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}
