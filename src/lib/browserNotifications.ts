// Issue #34 - browser notifications as a cheap interim reminder channel, using the plain Web
// Notification API (`new Notification(...)`), not the full Push API. Deliberately scoped this
// way per the issue's own framing ("needing nothing but the user's browser permission") - the
// real Push API needs a service worker, VAPID key generation, and a new backend
// subscription-storage endpoint, a much bigger feature than this issue asked for. The real,
// honest limitation of this simpler approach: it only ever fires while the app is actually
// loaded in an open browser tab, not a true background push once the browser itself is closed -
// NotificationsPage's own copy says so explicitly, so this isn't oversold as more than it is.

const ENABLED_KEY = "compliance-tracker:browser-notifications-enabled";
const NOTIFIED_KEY = "compliance-tracker:browser-notifications-notified";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

export function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

// A separate on/off preference from the browser's own permission grant - permission alone can't
// be revoked by this app (only the user, via their browser's own settings), so an in-app toggle
// needs its own state to let someone turn notifications back off without leaving the browser.
export function isEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export function setEnabled(value: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(value));
}

function readNotifiedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// One key per real deadline (business + obligation type + due date + custom-obligation id, the
// same shape backend's own DeadlineSyncService dedupe key uses for the same reason - two
// different custom obligations can share a due date, see backend issue #59's own dedup fix).
export function deadlineKey(
  businessId: number,
  deadline: { obligationType: string; dueDate: string; customObligationId?: number },
): string {
  return `${businessId}:${deadline.obligationType}:${deadline.dueDate}:${deadline.customObligationId ?? ""}`;
}

export function hasBeenNotified(key: string): boolean {
  return readNotifiedKeys().has(key);
}

// Marks a deadline notified, and prunes any tracked key whose own due date is more than 30 days
// in the past while it's at it - otherwise this set only ever grows, one entry for every real
// deadline this account has ever had, for as long as the browser keeps the localStorage entry.
// No separate dueDate param needed - deadlineKey() already embeds it (index 2), read back below.
export function markNotified(key: string): void {
  const keys = readNotifiedKeys();
  keys.add(key);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const pruned = new Set(
    [...keys].filter((k) => {
      const due = k.split(":")[2];
      return !due || new Date(due) >= cutoff;
    }),
  );
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...pruned]));
}

// onClick focuses the tab and runs the callback (typically a navigate to the relevant business)
// before closing the notification itself - a plain Notification click doesn't do any of that on
// its own.
export function notify(title: string, options?: NotificationOptions, onClick?: () => void): void {
  if (getPermission() !== "granted") return;

  const notification = new Notification(title, options);
  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
}
