import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as browserNotifications from "@/lib/browserNotifications";
import { useAllDeadlines } from "@/lib/useAllDeadlines";
import { daysUntil, deadlineLabel } from "@/lib/urgency";
import type { Business } from "@/lib/types";

// Deadlines only ever change day to day, not minute to minute - 15 minutes is frequent enough to
// catch "left the tab open overnight" without polling the backend needlessly.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

interface BrowserNotificationWatcherProps {
  businesses: Business[];
}

// Issue #34 - fires a real browser Notification for any deadline that's newly "due soon", using
// each business's own leadTimeDays (backend #53's existing configurable per-business value -
// deliberately the same threshold the backend's own SqsDispatchService reminder pipeline uses to
// decide what counts as "due soon enough to remind about," not a separate hardcoded number this
// UI would need to keep in sync by hand). Renders nothing - a pure side-effect component, mounted
// once in Shell so it keeps running regardless of which authenticated page happens to be open.
export function BrowserNotificationWatcher({ businesses }: BrowserNotificationWatcherProps) {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { allDeadlines } = useAllDeadlines(businesses, refreshKey);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!browserNotifications.isEnabled() || browserNotifications.getPermission() !== "granted") return;

    for (const { business, deadline } of allDeadlines) {
      const days = daysUntil(deadline.dueDate);
      if (days > business.leadTimeDays) continue;

      const key = browserNotifications.deadlineKey(business.id, deadline);
      if (browserNotifications.hasBeenNotified(key)) continue;

      const body = days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? "Due today" : `Due in ${days} day(s)`;

      browserNotifications.notify(`${business.name}: ${deadlineLabel(deadline)}`, { body, tag: key }, () =>
        navigate(`/businesses/${business.id}`),
      );
      browserNotifications.markNotified(key);
    }
  }, [allDeadlines, navigate]);

  return null;
}
