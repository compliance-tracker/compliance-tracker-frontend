import { useEffect, useState } from "react";
import { Bell, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/FormError";
import { Skeleton } from "@/components/ui/skeleton";
import * as browserNotifications from "@/lib/browserNotifications";
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

  // Not reactive sources (localStorage, the browser's own Notification.permission) - read once
  // into real state so a toggle/permission-prompt result actually re-renders this page.
  const [browserEnabled, setBrowserEnabled] = useState(() => browserNotifications.isEnabled());
  const [permission, setPermission] = useState(() => browserNotifications.getPermission());

  useEffect(() => {
    api
      .getNotificationStatus()
      .then(setStatus)
      .catch(() => setError("Could not load notification status. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleBrowserNotifications(checked: boolean) {
    if (!checked) {
      browserNotifications.setEnabled(false);
      setBrowserEnabled(false);
      return;
    }

    // Only actually prompts the browser the first time - a permission the user already
    // granted/denied resolves immediately with that same value, no second prompt shown.
    const result = await browserNotifications.requestPermission();
    setPermission(result);
    // Only turn the in-app preference on if permission was actually granted - otherwise the
    // checkbox would show "on" for a channel that can never actually fire anything.
    const enabled = result === "granted";
    browserNotifications.setEnabled(enabled);
    setBrowserEnabled(enabled);
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">How reminders currently reach you.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3.5 border-b border-border pb-4.5">
              <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-14 rounded-4xl" />
            </div>
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

      <Card className="shadow-sm">
        <CardContent>
          <div className="flex items-center gap-3.5 pb-4.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/14 text-primary">
              <Bell className="h-[18px] w-[18px]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Browser notifications</div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                An interim reminder channel, per account, that needs nothing but your browser's
                own permission — no email setup required.
              </div>
            </div>
            {browserEnabled && (
              <Badge variant="secondary" className="bg-primary/14 text-primary">
                On
              </Badge>
            )}
          </div>

          {!browserNotifications.isSupported() ? (
            <p className="text-[12.5px] text-muted-foreground">
              Your browser doesn't support notifications, so this isn't available here.
            </p>
          ) : permission === "denied" ? (
            <p className="text-[12.5px] text-muted-foreground">
              Blocked by your browser. Enable notifications for this site in your browser's own
              settings to turn this on.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="browser-notifications-toggle"
                  checked={browserEnabled}
                  onCheckedChange={(checked) => handleToggleBrowserNotifications(checked === true)}
                />
                <label htmlFor="browser-notifications-toggle" className="text-sm">
                  Notify me in this browser when a deadline is due soon
                </label>
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                Uses each business's own reminder lead time (set on the business itself) to decide
                what counts as "due soon." Real limitation, not a bug: this only fires while
                Compliance Tracker is actually open in a browser tab — it can't reach you once the
                tab or browser is closed, unlike a real email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
