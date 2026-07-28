import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessList } from "./BusinessList";
import type { Business } from "@/lib/types";

const businesses: Business[] = [
  { id: 1, name: "Zebra Trading Pte Ltd", financialYearEnd: "2026-12-31", gstRegistered: true },
  { id: 2, name: "Acme Cafe Pte Ltd", financialYearEnd: "2026-03-31", gstRegistered: false },
  { id: 3, name: "Mango Consulting Pte Ltd", financialYearEnd: "2026-09-30", gstRegistered: true },
];

function renderList(list: Business[] = businesses) {
  return render(
    <BusinessList
      businesses={list}
      selectedId={null}
      onSelect={vi.fn()}
      onUpdated={vi.fn()}
      onDeleted={vi.fn()}
    />
  );
}

function rowNames() {
  const rows = screen.getAllByRole("row").slice(1); // drop the header row
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("BusinessList", () => {
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
