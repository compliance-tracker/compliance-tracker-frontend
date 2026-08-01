import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BusinessList } from "./BusinessList";
import { downloadCsv } from "@/lib/csv";
import type { Business } from "@/lib/types";

// Real toCsv (proves the actual CSV content), mocked downloadCsv (no real file/DOM download
// mechanics to verify here - src/lib/csv.test.ts already covers those in isolation).
vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  return { ...actual, downloadCsv: vi.fn() };
});

const businesses: Business[] = [
  { id: 1, name: "Zebra Trading Pte Ltd", financialYearEnd: "2026-12-31", gstRegistered: true, leadTimeDays: 14, incorporationDate: null },
  { id: 2, name: "Acme Cafe Pte Ltd", financialYearEnd: "2026-03-31", gstRegistered: false, leadTimeDays: 30, incorporationDate: null },
  { id: 3, name: "Mango Consulting Pte Ltd", financialYearEnd: "2026-09-30", gstRegistered: true, leadTimeDays: 14, incorporationDate: "2026-01-15" },
];

function renderList(list: Business[] = businesses) {
  return render(
    <MemoryRouter>
      <BusinessList businesses={list} />
    </MemoryRouter>,
  );
}

function rowNames() {
  const rows = screen.getAllByRole("row").slice(1); // drop the header row
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

beforeEach(() => {
  vi.mocked(downloadCsv).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("BusinessList", () => {
  it("does not show an Export CSV button when there are no businesses at all", () => {
    renderList([]);
    expect(screen.queryByRole("button", { name: "Export CSV" })).not.toBeInTheDocument();
  });

  it("exports the currently visible (filtered) businesses, not the full unfiltered list", async () => {
    const user = userEvent.setup();
    renderList();

    await user.type(screen.getByPlaceholderText("Search by name..."), "mango");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadCsv).toHaveBeenCalledOnce();
    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(filename).toBe("businesses.csv");
    expect(csv).toContain("Mango Consulting Pte Ltd");
    expect(csv).not.toContain("Zebra Trading Pte Ltd");
    expect(csv).not.toContain("Acme Cafe Pte Ltd");
  });

  it("includes GST status and reminder lead time as real Yes/No and day counts, not raw booleans", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const csv = vi.mocked(downloadCsv).mock.calls[0][1];
    expect(csv).toContain("Yes"); // Zebra and Mango are GST-registered
    expect(csv).toContain("No"); // Acme is not
    expect(csv).toContain("30"); // Acme's leadTimeDays
  });

  it("shows the empty state when there are no businesses at all, with no search/filter controls", () => {
    renderList([]);

    expect(screen.getByText("No businesses yet — add one to get started.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by name...")).not.toBeInTheDocument();
  });

  it("sorts by name ascending by default", () => {
    renderList();

    expect(rowNames()).toEqual(["Acme Cafe Pte Ltd", "Mango Consulting Pte Ltd", "Zebra Trading Pte Ltd"]);
  });

  it("filters by name as the user types in the search box", async () => {
    const user = userEvent.setup();
    renderList();

    await user.type(screen.getByPlaceholderText("Search by name..."), "mango");

    expect(rowNames()).toEqual(["Mango Consulting Pte Ltd"]);
  });

  it("shows a no-results message when the search matches nothing, without showing the fully-empty-list message", async () => {
    const user = userEvent.setup();
    renderList();

    await user.type(screen.getByPlaceholderText("Search by name..."), "nonexistent business");

    expect(screen.getByText("No businesses match your search/filter.")).toBeInTheDocument();
    expect(screen.queryByText("No businesses yet — add one to get started.")).not.toBeInTheDocument();
  });

  it("filters by GST status", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText("Filter by GST status"));
    await user.click(screen.getByRole("option", { name: "Not GST-registered" }));

    expect(rowNames()).toEqual(["Acme Cafe Pte Ltd"]);
  });

  it("reverses order when the sort direction toggle is clicked", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText("Sort descending"));

    expect(rowNames()).toEqual(["Zebra Trading Pte Ltd", "Mango Consulting Pte Ltd", "Acme Cafe Pte Ltd"]);
  });

  it("sorts by financial year end when that sort field is selected", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText("Sort by"));
    await user.click(screen.getByRole("option", { name: "Sort by FYE" }));

    // 2026-03-31 (Acme) < 2026-09-30 (Mango) < 2026-12-31 (Zebra)
    expect(rowNames()).toEqual(["Acme Cafe Pte Ltd", "Mango Consulting Pte Ltd", "Zebra Trading Pte Ltd"]);
  });
});
