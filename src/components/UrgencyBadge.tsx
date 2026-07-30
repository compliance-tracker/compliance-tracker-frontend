import { AlertTriangle, CalendarCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { daysUntil, urgencyClasses, urgencyLabel, urgencyTier } from "@/lib/urgency";

const TIER_ICONS = {
  high: AlertTriangle,
  med: Clock,
  low: CalendarCheck,
} as const;

interface UrgencyBadgeProps {
  dueDate: string;
  className?: string;
}

// Shared by DeadlinesPanel, WorkPassesPanel, CustomObligationsPanel, and CalendarPage's upcoming
// timeline - all four used to render urgencyClasses/urgencyLabel directly as a plain text-only
// Badge. Issue #26 (accessibility pass): the badge's own "18d left"/"5d overdue" text already
// meant urgency was never conveyed by color *alone* here (unlike the calendar's day-dots, which
// were - see CalendarPage's own MonthGrid comment), but a tier-specific icon makes the distinction
// scannable at a glance without reading the number, matching the issue's explicit ask for "a
// text/icon indicator alongside color, not instead of it." Extracted as one shared component so
// every current and future urgency badge automatically gets both, rather than four separate
// places that could drift.
export function UrgencyBadge({ dueDate, className }: UrgencyBadgeProps) {
  const days = daysUntil(dueDate);
  const tier = urgencyTier(days);
  const Icon = TIER_ICONS[tier];

  return (
    <Badge className={cn(urgencyClasses(days), className)}>
      <Icon />
      {urgencyLabel(days)}
    </Badge>
  );
}
