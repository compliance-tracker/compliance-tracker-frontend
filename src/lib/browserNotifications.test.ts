import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as browserNotifications from "./browserNotifications";

// jsdom doesn't implement the Notification API at all - a minimal stand-in, mirroring the real
// constructor's shape (a static, mutable `permission`, a static `requestPermission`, and
// instances with `close()`/settable `onclick`) is enough for these tests, which are about our own
// wrapper logic (enabling/dedup/pruning), not the browser's own notification-rendering behavior.
class MockNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => MockNotification.permission);
  static instances: MockNotification[] = [];
  onclick: (() => void) | null = null;
  close = vi.fn();
  title: string;
  options?: NotificationOptions;
  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
    MockNotification.instances.push(this);
  }
}

beforeEach(() => {
  localStorage.clear();
  MockNotification.permission = "default";
  MockNotification.instances = [];
  vi.stubGlobal("Notification", MockNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser notification preference", () => {
  it("defaults to disabled", () => {
    expect(browserNotifications.isEnabled()).toBe(false);
  });

  it("round-trips through setEnabled/isEnabled", () => {
    browserNotifications.setEnabled(true);
    expect(browserNotifications.isEnabled()).toBe(true);

    browserNotifications.setEnabled(false);
    expect(browserNotifications.isEnabled()).toBe(false);
  });
});

describe("deadlineKey", () => {
  it("includes the business id, obligation type, and due date", () => {
    expect(browserNotifications.deadlineKey(1, { obligationType: "GST_F5", dueDate: "2026-10-30" })).toBe(
      "1:GST_F5:2026-10-30:",
    );
  });

  it("distinguishes two custom obligations sharing the same due date, via customObligationId", () => {
    const a = browserNotifications.deadlineKey(1, {
      obligationType: "CUSTOM",
      dueDate: "2026-12-31",
      customObligationId: 10,
    });
    const b = browserNotifications.deadlineKey(1, {
      obligationType: "CUSTOM",
      dueDate: "2026-12-31",
      customObligationId: 11,
    });
    expect(a).not.toBe(b);
  });
});

describe("hasBeenNotified / markNotified", () => {
  it("a deadline is not marked notified until markNotified is called", () => {
    const key = browserNotifications.deadlineKey(1, { obligationType: "GST_F5", dueDate: "2026-10-30" });
    expect(browserNotifications.hasBeenNotified(key)).toBe(false);

    browserNotifications.markNotified(key);
    expect(browserNotifications.hasBeenNotified(key)).toBe(true);
  });

  it("prunes a tracked key whose own due date is more than 30 days in the past", () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 40);
    const staleIso = staleDate.toISOString().slice(0, 10);
    const staleKey = browserNotifications.deadlineKey(1, { obligationType: "GST_F5", dueDate: staleIso });

    const freshKey = browserNotifications.deadlineKey(2, { obligationType: "GST_F5", dueDate: "2026-10-30" });

    browserNotifications.markNotified(staleKey);
    browserNotifications.markNotified(freshKey);

    expect(browserNotifications.hasBeenNotified(staleKey)).toBe(false);
    expect(browserNotifications.hasBeenNotified(freshKey)).toBe(true);
  });
});

describe("notify", () => {
  it("does not create a Notification when permission is not granted", () => {
    MockNotification.permission = "default";
    browserNotifications.notify("Title");
    expect(MockNotification.instances).toHaveLength(0);
  });

  it("creates a real Notification with the given title/body when permission is granted", () => {
    MockNotification.permission = "granted";
    browserNotifications.notify("Business: ACRA Annual Return", { body: "Due in 5 day(s)" });

    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe("Business: ACRA Annual Return");
    expect(MockNotification.instances[0].options?.body).toBe("Due in 5 day(s)");
  });

  it("wires the onclick handler to focus the window, run the callback, then close", () => {
    MockNotification.permission = "granted";
    const onClick = vi.fn();
    const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});

    browserNotifications.notify("Title", { body: "Body" }, onClick);
    const instance = MockNotification.instances[0];
    instance.onclick?.();

    expect(focusSpy).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
    expect(instance.close).toHaveBeenCalledOnce();
  });
});
