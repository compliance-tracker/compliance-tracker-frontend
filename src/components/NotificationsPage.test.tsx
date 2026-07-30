import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsPage } from "./NotificationsPage";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { getNotificationStatus: vi.fn() } };
});

// jsdom doesn't implement the Notification API - see browserNotifications.test.ts's own comment
// for why a minimal stand-in is enough here too (this file is testing NotificationsPage's own
// toggle wiring, not the browser's real notification behavior).
class MockNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => MockNotification.permission);
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getNotificationStatus).mockReset();
  vi.mocked(api.getNotificationStatus).mockResolvedValue({ channel: "logging" });
  MockNotification.permission = "default";
  MockNotification.requestPermission = vi.fn(async () => MockNotification.permission);
  vi.stubGlobal("Notification", MockNotification);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("NotificationsPage", () => {
  it("shows the logging channel as active when that's what the backend reports", async () => {
    vi.mocked(api.getNotificationStatus).mockResolvedValue({ channel: "logging" });

    render(<NotificationsPage />);

    expect(await screen.findByText("Logging (development)")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText(/Sent from/)).not.toBeInTheDocument();
  });

  it("shows the email channel and its from-address when that's active", async () => {
    vi.mocked(api.getNotificationStatus).mockResolvedValue({
      channel: "email",
      fromAddress: "reminders@example.com",
    });

    render(<NotificationsPage />);

    expect(await screen.findByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Sent from reminders@example.com")).toBeInTheDocument();
  });

  it("shows a generic error message if the status request fails", async () => {
    vi.mocked(api.getNotificationStatus).mockRejectedValue(new Error("network error"));

    render(<NotificationsPage />);

    expect(await screen.findByText("Could not load notification status. Is the backend running?")).toBeInTheDocument();
  });

  describe("browser notifications (issue #34)", () => {
    it("checking the toggle requests permission, and turns the preference on when granted", async () => {
      MockNotification.permission = "granted";
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const toggle = await screen.findByLabelText("Notify me in this browser when a deadline is due soon");
      await user.click(toggle);

      expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
      expect(toggle).toBeChecked();
    });

    it("does not turn the preference on if the user denies the permission prompt", async () => {
      // Starts undecided (the toggle is visible, since only an already-denied permission hides
      // it entirely - see the "already denied" test below) - the click itself is what resolves
      // to "denied", the real shape of a user clicking "Block" on the browser's own prompt.
      MockNotification.permission = "default";
      MockNotification.requestPermission = vi.fn(async () => "denied");
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const toggle = await screen.findByLabelText("Notify me in this browser when a deadline is due soon");
      await user.click(toggle);

      // Permission is now denied, so the whole toggle UI is replaced with an explanation instead
      // of a checked-but-nonfunctional checkbox.
      expect(
        await screen.findByText(/Blocked by your browser\. Enable notifications for this site/),
      ).toBeInTheDocument();
    });

    it("unchecking the toggle turns the preference off without re-prompting permission", async () => {
      MockNotification.permission = "granted";
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const toggle = await screen.findByLabelText("Notify me in this browser when a deadline is due soon");
      await user.click(toggle);
      expect(toggle).toBeChecked();

      await user.click(toggle);
      expect(toggle).not.toBeChecked();
      expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
    });

    it("shows a blocked message, not a toggle, when permission was already denied", async () => {
      MockNotification.permission = "denied";
      render(<NotificationsPage />);

      await screen.findByText("Browser notifications");
      expect(
        screen.getByText(/Blocked by your browser\. Enable notifications for this site/),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Notify me in this browser when a deadline is due soon"),
      ).not.toBeInTheDocument();
    });
  });
});
