import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatSeverity = "default" | "warn" | "danger";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  // Harbour Ledger stat tiles (issue #59) - a thin top stripe carries severity as form, not just
  // the figure's own color, so it reads at a glance without needing to read the number first.
  severity?: StatSeverity;
}

const STRIPE_CLASSES: Record<StatSeverity, string> = {
  default: "bg-primary",
  warn: "bg-amber",
  danger: "bg-destructive",
};

const ICON_CLASSES: Record<StatSeverity, string> = {
  default: "bg-primary/10 text-primary",
  warn: "bg-amber/10 text-amber",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({ label, value, icon: Icon, severity = "default" }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden shadow-sm">
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", STRIPE_CLASSES[severity])} />
      <CardContent className="flex items-center gap-4 py-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", ICON_CLASSES[severity])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
