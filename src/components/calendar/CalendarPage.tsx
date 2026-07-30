import { CalendarClock } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { cn } from "@/lib/utils";
import { daysUntil, deadlineLabel, urgencyTier } from "@/lib/urgency";
import { useAllDeadlines, type BusinessDeadline } from "@/lib/useAllDeadlines";
import type { ShellContext } from "@/components/shell/Shell";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Issue #26 (accessibility pass): shape-differentiated, not just color-differentiated - a
// colorblind user couldn't previously tell a "due soon" day from a "not urgent" one at all, since
// every dot was identical apart from hue (a solid bg-destructive/bg-amber/bg-muted-foreground
// circle). Each tier now has a genuinely different shape too (filled circle / rotated square /
// hollow ring), on top of color, so the distinction survives even with color removed entirely.
const DOT_SHAPE_CLASSES: Record<string, string> = {
  high: "h-1.5 w-1.5 rounded-full bg-destructive",
  med: "h-1.5 w-1.5 rotate-45 bg-amber",
  low: "h-1.5 w-1.5 rounded-full border border-muted-foreground bg-transparent",
};

// The mockup's Calendar page (issue #63/#19) - a month grid plus an "upcoming, all businesses"
// timeline, both driven by merging every business's own deadlines client-side. No backend
// endpoint returns deadlines across every business at once, so this fetches each business's
// GET /api/businesses/{id}/deadlines individually (fine at this app's scale - one SME's own
// businesses, not a multi-tenant global list, same reasoning BusinessList's client-side
// search/sort/filter already relies on).
export function CalendarPage() {
  const { businesses, loading: businessesLoading } = useOutletContext<ShellContext>();
  const { allDeadlines, loading } = useAllDeadlines(businesses);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const deadlinesByDate = new Map<string, BusinessDeadline[]>();
  for (const bd of allDeadlines) {
    const existing = deadlinesByDate.get(bd.deadline.dueDate);
    if (existing) existing.push(bd);
    else deadlinesByDate.set(bd.deadline.dueDate, [bd]);
  }

  const upcoming = [...allDeadlines].sort((a, b) => a.deadline.dueDate.localeCompare(b.deadline.dueDate));

  const isLoading = businessesLoading || loading;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Deadlines calendar</h1>
        <p className="text-sm text-muted-foreground">Every business's upcoming obligations, in one place.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              {MONTH_LABELS[month]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthGrid year={year} month={month} deadlinesByDate={deadlinesByDate} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Upcoming, all businesses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <div className="w-[54px] shrink-0 space-y-1.5">
                      <Skeleton className="mx-auto h-5 w-6" />
                      <Skeleton className="mx-auto h-2.5 w-8" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-16 self-start" />
                  </div>
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-center">
                <div className="mb-2.5 flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarClock className="h-[22px] w-[22px]" />
                </div>
                <h3 className="text-[14.5px] font-semibold">Nothing on the horizon</h3>
                <p className="mb-3.5 max-w-[34ch] text-sm text-muted-foreground">
                  Deadlines appear here automatically once a business is tracked.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/businesses">Go to businesses</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map(({ business, deadline }, i) => {
                  const [, m, d] = deadline.dueDate.split("-").map(Number);
                  return (
                    <div key={`${business.id}-${deadline.obligationType}-${i}`} className="flex gap-3 py-3">
                      <div className="w-[54px] shrink-0 text-center">
                        <div className="font-mono text-lg leading-tight font-bold">{d}</div>
                        <div className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
                          {MONTH_ABBR[m - 1]}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold">{business.name}</div>
                        <div className="mt-px text-[12.5px] text-muted-foreground">
                          {deadlineLabel(deadline)}
                        </div>
                      </div>
                      <UrgencyBadge dueDate={deadline.dueDate} className="self-start" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  deadlinesByDate: Map<string, BusinessDeadline[]>;
}

function MonthGrid({ year, month, deadlinesByDate }: MonthGridProps) {
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): Sun=0..Sat=6 - shifted so Monday is the first column, matching the mockup's
  // Mon-start week (WEEKDAY_LABELS above).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="pb-1.5 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
      ))}
      {cells.map((day, i) => {
        if (day === null) return <div key={`blank-${i}`} />;

        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayDeadlines = deadlinesByDate.get(iso) ?? [];
        const isToday = iso === todayIso;

        // The dots convey real information (what's due, and how urgent) with nothing else on
        // the page carrying it in text form - a screen reader's virtual cursor otherwise only
        // ever hears the bare day number. This aria-label is the accessible equivalent of "look
        // at the colored/shaped dots," not a duplicate of anything already readable elsewhere.
        const dayLabel =
          dayDeadlines.length > 0
            ? `${day}, ${dayDeadlines.length} deadline${dayDeadlines.length > 1 ? "s" : ""}: ${dayDeadlines
                .map((bd) => `${deadlineLabel(bd.deadline)} for ${bd.business.name}`)
                .join(", ")}`
            : undefined;

        return (
          <div
            key={iso}
            className={cn(
              "flex aspect-square flex-col gap-0.5 rounded-[9px] border p-1.5 font-mono text-xs",
              isToday ? "border-[1.5px] border-primary bg-primary/6" : "border-border",
            )}
            aria-label={dayLabel}
          >
            <span aria-hidden={dayLabel ? "true" : undefined}>{day}</span>
            {dayDeadlines.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-0.5" aria-hidden="true">
                {dayDeadlines.map((bd, i) => (
                  <span key={i} className={DOT_SHAPE_CLASSES[urgencyTier(daysUntil(bd.deadline.dueDate))]} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
