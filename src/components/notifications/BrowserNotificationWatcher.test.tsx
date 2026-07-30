import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BrowserNotificationWatcher } from "./BrowserNotificationWatcher";
import { api } from "@/lib/api";
import * as browserNotifications from "@/lib/browserNotifications";
import type { Business, Deadline } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { getDeadlines: vi.fn() } };
});

const business: Business = {
  id: 1,
  name: "Test Co",
  financialYearEnd: "2026-12-31",
  gstRegistered: false,
  leadTimeDays: 14,
  incorporationDate: null,
};

function daysFromNowIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getDeadlines).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("BrowserNotificationWatcher", () => {
  it("does nothing when the preference is off, even with permission granted", async () => {
    vi.spyOn(browserNotifications, "isEnabled").mockReturnValue(false);
    vi.spyOn(browserNotifications, "getPermission").mockReturnValue("granted");
    const notifySpy = vi.spyOn(browserNotifications, "notify").mockImplementation(() => {});
    const deadline: Deadline = { obligationType: "GST_F5", dueDate: daysFromNowIso(3) };
    vi.mocked(api.getDeadlines).mockResolvedValue([deadline]);

    render(
      <MemoryRouter>
        <BrowserNotificationWatcher businesses={[business]} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.getDeadlines).toHaveBeenCalled());
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("notifies for a deadline within the business's own lead time, once", async () => {
    vi.spyOn(browserNotifications, "isEnabled").mockReturnValue(true);
    vi.spyOn(browserNotifications, "getPermission").mockReturnValue("granted");
    const notifySpy = vi.spyOn(browserNotifications, "notify").mockImplementation(() => {});
    // Within the business's 14-day lead time.
    const deadline: Deadline = { obligationType: "GST_F5", dueDate: daysFromNowIso(5) };
    vi.mocked(api.getDeadlines).mockResolvedValue([deadline]);

    render(
      <MemoryRouter>
        <BrowserNotificationWatcher businesses={[business]} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(notifySpy).toHaveBeenCalledOnce());
    expect(notifySpy.mock.calls[0][0]).toContain("Test Co");
  });

  it("does not notify for a deadline further out than the business's own lead time", async () => {
    vi.spyOn(browserNotifications, "isEnabled").mockReturnValue(true);
    vi.spyOn(browserNotifications, "getPermission").mockReturnValue("granted");
    const notifySpy = vi.spyOn(browserNotifications, "notify").mockImplementation(() => {});
    // Well beyond the business's 14-day lead time.
    const deadline: Deadline = { obligationType: "GST_F5", dueDate: daysFromNowIso(60) };
    vi.mocked(api.getDeadlines).mockResolvedValue([deadline]);

    render(
      <MemoryRouter>
        <BrowserNotificationWatcher businesses={[business]} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.getDeadlines).toHaveBeenCalled());
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("does not notify twice for the same deadline (deduped across a re-render)", async () => {
    vi.spyOn(browserNotifications, "isEnabled").mockReturnValue(true);
    vi.spyOn(browserNotifications, "getPermission").mockReturnValue("granted");
    const notifySpy = vi.spyOn(browserNotifications, "notify").mockImplementation(() => {});
    const deadline: Deadline = { obligationType: "GST_F5", dueDate: daysFromNowIso(5) };
    vi.mocked(api.getDeadlines).mockResolvedValue([deadline]);

    const { rerender } = render(
      <MemoryRouter>
        <BrowserNotificationWatcher businesses={[business]} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(notifySpy).toHaveBeenCalledOnce());

    rerender(
      <MemoryRouter>
        <BrowserNotificationWatcher businesses={[{ ...business }]} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.getDeadlines).toHaveBeenCalledTimes(2));
    expect(notifySpy).toHaveBeenCalledOnce();
  });
});
