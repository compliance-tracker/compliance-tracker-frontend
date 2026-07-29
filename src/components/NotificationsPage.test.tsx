import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationsPage } from "./NotificationsPage";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { getNotificationStatus: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.getNotificationStatus).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
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
});
