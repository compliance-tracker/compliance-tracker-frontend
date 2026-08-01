import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeadlinesPanel } from "./DeadlinesPanel";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import type { Business, Deadline } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { getDeadlines: vi.fn() } };
});

vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  return { ...actual, downloadCsv: vi.fn() };
});

const business: Business = {
  id: 1,
  name: "Test Cafe Pte Ltd",
  financialYearEnd: "2026-12-31",
  gstRegistered: false,
  leadTimeDays: 14,
  incorporationDate: null,
};

const deadlines: Deadline[] = [
  { obligationType: "GST_F5", dueDate: "2026-10-30" },
  { obligationType: "ACRA_ANNUAL_RETURN", dueDate: "2027-07-31" },
];

beforeEach(() => {
  vi.mocked(api.getDeadlines).mockReset().mockResolvedValue(deadlines);
  vi.mocked(downloadCsv).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DeadlinesPanel - CSV export (issue #27)", () => {
  it("does not show an Export CSV button when there are no deadlines", async () => {
    vi.mocked(api.getDeadlines).mockResolvedValue([]);
    render(<DeadlinesPanel business={business} />);

    await screen.findByText("No deadlines computed for this business.");
    expect(screen.queryByRole("button", { name: "Export CSV" })).not.toBeInTheDocument();
  });

  it("exports the real obligation labels and due dates, filename identifying the business", async () => {
    const user = userEvent.setup();
    render(<DeadlinesPanel business={business} />);

    await screen.findByText("2026-10-30");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadCsv).toHaveBeenCalledOnce();
    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(filename).toBe("test-cafe-pte-ltd-deadlines.csv");
    expect(csv).toContain("GST F5 Filing");
    expect(csv).toContain("2026-10-30");
    expect(csv).toContain("ACRA Annual Return");
    expect(csv).toContain("2027-07-31");
  });

  it("sanitizes a business name with punctuation into a safe filename", async () => {
    const user = userEvent.setup();
    render(<DeadlinesPanel business={{ ...business, name: "Tan & Sons (Pte.) Ltd." }} />);

    await screen.findByText("2026-10-30");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const filename = vi.mocked(downloadCsv).mock.calls[0][0];
    expect(filename).toMatch(/^[a-z0-9-]+-deadlines\.csv$/);
  });
});
