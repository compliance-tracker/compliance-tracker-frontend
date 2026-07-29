import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NavRail } from "./NavRail";

// NavRail reads :id via useParams (issue #61) - only meaningful inside a matching <Route>, so
// these tests render it through a real Routes tree at different paths rather than a bare
// MemoryRouter, the same way the real Shell/App renders it.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/businesses" element={<NavRail onLogout={vi.fn()} />} />
        <Route path="/businesses/:id" element={<NavRail onLogout={vi.fn()} />} />
        <Route path="/businesses/:id/edit" element={<NavRail onLogout={vi.fn()} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NavRail", () => {
  it("always shows a real Calendar link, regardless of whether a business is selected (issue #63)", () => {
    renderAt("/businesses");

    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/calendar");
  });

  it("disables Work passes/Edit business (not real links) when no business is selected", () => {
    renderAt("/businesses");

    expect(screen.queryByRole("link", { name: "Work passes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit business" })).not.toBeInTheDocument();
    expect(screen.getByText("Work passes")).toBeInTheDocument();
    expect(screen.getByText("Edit business")).toBeInTheDocument();
  });

  it("makes Work passes/Edit business real links, scoped to the selected business, once one is selected", () => {
    renderAt("/businesses/42");

    expect(screen.getByRole("link", { name: "Work passes" })).toHaveAttribute("href", "/businesses/42");
    expect(screen.getByRole("link", { name: "Edit business" })).toHaveAttribute("href", "/businesses/42/edit");
  });

  it("marks the current page's nav item active", () => {
    renderAt("/businesses/42/edit");

    expect(screen.getByRole("link", { name: "Edit business" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Work passes" })).not.toHaveAttribute("aria-current");
  });

  it("calls onLogout when the Log out button is clicked", async () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter initialEntries={["/businesses"]}>
        <Routes>
          <Route path="/businesses" element={<NavRail onLogout={onLogout} />} />
        </Routes>
      </MemoryRouter>,
    );

    screen.getByRole("button", { name: "Log out" }).click();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
