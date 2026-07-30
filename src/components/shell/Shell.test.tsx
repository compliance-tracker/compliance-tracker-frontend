import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./Shell";

const context = {
  businesses: [],
  loading: false,
  error: null,
  onCreated: vi.fn(),
  onUpdated: vi.fn(),
  onDeleted: vi.fn(),
  onLogout: vi.fn(),
};

function renderShell(initialPath = "/businesses") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Shell context={context} />}>
          <Route path="/businesses" element={<p>Businesses page</p>} />
          <Route path="/calendar" element={<p>Calendar page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// The mobile off-canvas nav rail (issue #71) - jsdom doesn't evaluate real CSS media queries, so
// these tests check the actual open/close *state* (the classes/elements React renders) rather
// than anything about how it visually looks at a given viewport width.
describe("Shell - mobile nav", () => {
  it("starts closed - the nav rail is translated off-screen, no backdrop rendered", () => {
    renderShell();

    expect(screen.getByRole("navigation").className).toContain("-translate-x-full");
    expect(screen.queryByTestId("mobile-nav-backdrop")).not.toBeInTheDocument();
  });

  it("opens the nav rail and shows a backdrop when the hamburger button is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("navigation").className).toContain("translate-x-0");
    expect(screen.getByTestId("mobile-nav-backdrop")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByTestId("mobile-nav-backdrop"));

    expect(screen.getByRole("navigation").className).toContain("-translate-x-full");
    expect(screen.queryByTestId("mobile-nav-backdrop")).not.toBeInTheDocument();
  });

  it("closes automatically when navigating to a different page", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation").className).toContain("translate-x-0");

    await user.click(screen.getByRole("link", { name: "Calendar" }));

    expect(await screen.findByText("Calendar page")).toBeInTheDocument();
    expect(screen.getByRole("navigation").className).toContain("-translate-x-full");
  });
});
