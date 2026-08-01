import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomObligationsPanel } from "./CustomObligationsPanel";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Business, CustomObligation } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      getCustomObligations: vi.fn(),
      createCustomObligation: vi.fn(),
      updateCustomObligation: vi.fn(),
      deleteCustomObligation: vi.fn(),
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

const oneOff: CustomObligation = { id: 1, name: "Renew insurance", dueDate: "2026-09-01", recurrenceMonths: null };
const recurring: CustomObligation = { id: 2, name: "File payroll return", dueDate: "2026-10-01", recurrenceMonths: 3 };

beforeEach(() => {
  vi.mocked(api.getCustomObligations).mockReset().mockResolvedValue([oneOff]);
  vi.mocked(api.createCustomObligation).mockReset();
  vi.mocked(api.updateCustomObligation).mockReset();
  vi.mocked(api.deleteCustomObligation).mockReset();
  vi.mocked(toast.success).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomObligationsPanel", () => {
  it("shows a one-off obligation as 'One-off', not a recurrence interval", async () => {
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    expect(screen.getByText("One-off")).toBeInTheDocument();
  });

  it("shows a recurring obligation's interval in months", async () => {
    vi.mocked(api.getCustomObligations).mockResolvedValue([recurring]);
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("File payroll return");
    expect(screen.getByText("Every 3 months")).toBeInTheDocument();
  });

  it("adding a one-off obligation (repeats left unchecked) sends recurrenceMonths: null", async () => {
    vi.mocked(api.getCustomObligations).mockResolvedValue([]);
    vi.mocked(api.createCustomObligation).mockResolvedValue({
      id: 3,
      name: "Renew lease",
      dueDate: "2027-01-01",
      recurrenceMonths: null,
    });
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await user.click(screen.getByRole("button", { name: "Add obligation" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Renew lease");
    await user.type(within(dialog).getByLabelText("Due date"), "2027-01-01");
    await user.click(within(dialog).getByRole("button", { name: "Add obligation" }));

    expect(api.createCustomObligation).toHaveBeenCalledWith(business.id, {
      name: "Renew lease",
      dueDate: "2027-01-01",
      recurrenceMonths: null,
    });
  });

  it("checking Repeats reveals a months input, and submits recurrenceMonths as a number", async () => {
    vi.mocked(api.getCustomObligations).mockResolvedValue([]);
    vi.mocked(api.createCustomObligation).mockResolvedValue({
      id: 4,
      name: "File payroll return",
      dueDate: "2026-10-01",
      recurrenceMonths: 3,
    });
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await user.click(screen.getByRole("button", { name: "Add obligation" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "File payroll return");
    await user.type(within(dialog).getByLabelText("Due date"), "2026-10-01");
    await user.click(within(dialog).getByLabelText("Repeats"));
    await user.type(within(dialog).getByLabelText("Every N months"), "3");
    await user.click(within(dialog).getByRole("button", { name: "Add obligation" }));

    expect(api.createCustomObligation).toHaveBeenCalledWith(business.id, {
      name: "File payroll return",
      dueDate: "2026-10-01",
      recurrenceMonths: 3,
    });
  });

  it("editing an obligation prefills the form with its current values", async () => {
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    await user.click(screen.getByRole("button", { name: "Edit Renew insurance" }));

    expect(screen.getByLabelText("Name")).toHaveValue("Renew insurance");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Repeats")).not.toBeChecked();
  });

  it("does not delete immediately - clicking remove opens a confirmation dialog instead", async () => {
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    await user.click(screen.getByRole("button", { name: "Remove Renew insurance" }));

    expect(screen.getByText("Remove Renew insurance?")).toBeInTheDocument();
    expect(api.deleteCustomObligation).not.toHaveBeenCalled();
    expect(screen.getByText("Renew insurance")).toBeInTheDocument();
  });

  it("confirming actually deletes the obligation", async () => {
    vi.mocked(api.deleteCustomObligation).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    await user.click(screen.getByRole("button", { name: "Remove Renew insurance" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    expect(api.deleteCustomObligation).toHaveBeenCalledWith(business.id, oneOff.id);
  });

  it("a failed delete rolls the row back instead of leaving the UI out of sync", async () => {
    vi.mocked(api.deleteCustomObligation).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    await user.click(screen.getByRole("button", { name: "Remove Renew insurance" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    await screen.findByText("Could not remove custom obligation. Is the backend running?");
    expect(screen.getByText("Renew insurance")).toBeInTheDocument();
  });
});

describe("CustomObligationsPanel - success toasts (issue #22)", () => {
  it("shows a toast naming the obligation once it's actually removed", async () => {
    vi.mocked(api.deleteCustomObligation).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CustomObligationsPanel business={business} />);

    await screen.findByText("Renew insurance");
    await user.click(screen.getByRole("button", { name: "Remove Renew insurance" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Renew insurance removed"));
  });
});
