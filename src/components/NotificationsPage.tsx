import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/FormError";
import { api } from "@/lib/api";
import type { NotificationStatus } from "@/lib/types";

// The Notifications status page (issue #73, the final piece of the Harbour Ledger redesign,
// #39) - read-only visibility into which NotificationSender channel is currently active (backend
// issue #114), an app-level server setting, not something changeable per account. Deliberately
// no "recently sent" history table - no backend endpoint for that, and building one would be a
// bigger feature (a persisted send log) that was never requested.
export function NotificationsPage() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getNotificationStatus()
      .then(setStatus)
      .catch(() => setError("Could not load notification status. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">How reminders currently reach you.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <FormError>{error}</FormError>
          ) : (
            status && (
              <>
                <div className="flex items-center gap-3.5 border-b border-border pb-4.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/14 text-primary">
                    <Mail className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {status.channel === "email" ? "Email" : "Logging (development)"}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {status.channel === "email"
                        ? `Sent from ${status.fromAddress}`
                        : "Reminders are logged to the server console, not actually delivered — the default until a real email channel is configured."}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/14 text-primary">
                    Active
                  </Badge>
                </div>

                <p className="pt-4 text-[12.5px] text-muted-foreground">
                  This is an app-level setting configured by whoever runs the server
                  (<code>notifications.channel</code>) — not something you can change per account
                  yet.
                </p>
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
