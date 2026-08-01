import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkPassesPanel } from "./WorkPassesPanel";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Business, WorkPass } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      getWorkPasses: vi.fn(),
      createWorkPass: vi.fn(),
      deleteWorkPass: vi.fn(),
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const business: Business = {
  id: 1,
  name: "Test Co",
  financialYearEnd: "2026-12-31",
  gstRegistered: false,
  leadTimeDays: 14,
  incorporationDate: null,
};

const workPass: WorkPass = { id: 1, employeeName: "Jane Doe", expiryDate: "2026-11-01" };

beforeEach(() => {
  vi.mocked(api.getWorkPasses).mockReset().mockResolvedValue([workPass]);
  vi.mocked(api.deleteWorkPass).mockReset();
  vi.mocked(toast.success).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("WorkPassesPanel - remove confirmation (issue #24)", () => {
  it("does not delete immediately - clicking the trash icon opens a confirmation dialog instead", async () => {
    vi.mocked(api.deleteWorkPass).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WorkPassesPanel business={business} />);

    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /Remove Jane Doe/ }));

    expect(screen.getByText("Remove Jane Doe's work pass?")).toBeInTheDocument();
    expect(api.deleteWorkPass).not.toHaveBeenCalled();
    // Still in the table underneath - nothing removed yet, just a confirmation shown.
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("Cancel closes the dialog without deleting", async () => {
    const user = userEvent.setup();
    render(<WorkPassesPanel business={business} />);

    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /Remove Jane Doe/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(api.deleteWorkPass).not.toHaveBeenCalled();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("confirming actually deletes the work pass", async () => {
    vi.mocked(api.deleteWorkPass).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WorkPassesPanel business={business} />);

    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /Remove Jane Doe/ }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    expect(api.deleteWorkPass).toHaveBeenCalledWith(business.id, workPass.id);
  });
});

describe("WorkPassesPanel - success toasts (issue #22)", () => {
  it("shows a toast naming the employee once a work pass is actually removed", async () => {
    vi.mocked(api.deleteWorkPass).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WorkPassesPanel business={business} />);

    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: /Remove Jane Doe/ }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Jane Doe's work pass removed"));
  });
});

describe("WorkPassesPanel - loading skeleton (issue #29)", () => {
  it("shows skeleton table rows while the fetch is in flight, real headers already visible", async () => {
    // A never-resolving promise keeps the component in its loading state for the whole test -
    // real behavior is proven by the follow-up test below, which lets the same fetch resolve.
    vi.mocked(api.getWorkPasses).mockReturnValue(new Promise(() => {}));
    render(<WorkPassesPanel business={business} />);

    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  it("replaces the skeleton with real rows once the fetch resolves", async () => {
    render(<WorkPassesPanel business={business} />);

    await screen.findByText("Jane Doe");

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
  });
});
