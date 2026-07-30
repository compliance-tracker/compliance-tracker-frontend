import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { CalendarPage } from "./CalendarPage";
import { api } from "@/lib/api";
import type { Business } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { getDeadlines: vi.fn() } };
});

const businessA: Business = {
  id: 1,
  name: "Alpha Pte Ltd",
  financialYearEnd: "2026-12-31",
  gstRegistered: false,
  leadTimeDays: 14,
  incorporationDate: null,
};
const businessB: Business = {
  id: 2,
  name: "Beta Pte Ltd",
  financialYearEnd: "2026-06-30",
  gstRegistered: true,
  leadTimeDays: 14,
  incorporationDate: null,
};

beforeEach(() => {
  vi.mocked(api.getDeadlines).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// useOutletContext() throws outside an actual Outlet - render CalendarPage through a real
// Outlet-bearing layout route instead of trying to fake the context another way, same approach
// as the real Shell.
function renderWithContext(businesses: Business[]) {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <Routes>
        <Route
          element={
            <Outlet
              context={{
                businesses,
                loading: false,
                error: null,
                onCreated: vi.fn(),
                onUpdated: vi.fn(),
                onDeleted: vi.fn(),
              }}
            />
          }
        >
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("CalendarPage", () => {
  it("shows the empty state and fetches nothing when there are no businesses at all", () => {
    renderWithContext([]);

    expect(screen.getByText("Nothing on the horizon")).toBeInTheDocument();
    expect(api.getDeadlines).not.toHaveBeenCalled();
  });

  it("merges deadlines from every business into one upcoming list, sorted by date", async () => {
    vi.mocked(api.getDeadlines).mockImplementation((businessId: number) =>
      Promise.resolve(
        businessId === businessA.id
          ? [{ obligationType: "ACRA_ANNUAL_RETURN" as const, dueDate: "2026-12-31" }]
          : [{ obligationType: "GST_F5" as const, dueDate: "2026-08-15" }],
      ),
    );

    renderWithContext([businessA, businessB]);

    expect(await screen.findByText("Beta Pte Ltd")).toBeInTheDocument();
    expect(screen.getByText("Alpha Pte Ltd")).toBeInTheDocument();

    // Beta's Aug deadline is earlier than Alpha's Dec one - sorted ascending by date.
    const names = screen.getAllByText(/Pte Ltd/).map((el) => el.textContent);
    expect(names).toEqual(["Beta Pte Ltd", "Alpha Pte Ltd"]);
  });
});
