import { describe, expect, it } from "vitest";
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
        <Route path="/businesses" element={<NavRail />} />
        <Route path="/businesses/:id" element={<NavRail />} />
        <Route path="/businesses/:id/edit" element={<NavRail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NavRail", () => {
  it("always shows a real Calendar link, regardless of whether a business is selected (issue #63)", () => {
    renderAt("/businesses");

    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/calendar");
  });

  it("always shows a real Account link, regardless of whether a business is selected (issue #67)", () => {
    renderAt("/businesses");

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  });

  it("disables Overview/Edit business (not real links) when no business is selected", () => {
    renderAt("/businesses");

    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit business" })).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Edit business")).toBeInTheDocument();
  });

  it("makes Overview/Edit business real links, scoped to the selected business, once one is selected", () => {
    renderAt("/businesses/42");

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/businesses/42");
    expect(screen.getByRole("link", { name: "Edit business" })).toHaveAttribute("href", "/businesses/42/edit");
  });

  it("marks the current page's nav item active", () => {
    renderAt("/businesses/42/edit");

    expect(screen.getByRole("link", { name: "Edit business" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
});
