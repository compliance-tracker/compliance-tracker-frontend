import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UrgencyBadge } from "./UrgencyBadge";

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("UrgencyBadge (issue #26 - accessibility pass)", () => {
  it("renders an icon in addition to color and text, not color/text alone", () => {
    const { container } = render(<UrgencyBadge dueDate={isoDaysFromNow(5)} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("a high-urgency (overdue) deadline shows the AlertTriangle icon", () => {
    const { container } = render(<UrgencyBadge dueDate={isoDaysFromNow(-2)} />);
    expect(container.querySelector("svg.lucide-triangle-alert")).toBeInTheDocument();
    expect(screen.getByText("2d overdue")).toBeInTheDocument();
  });

  it("a medium-urgency deadline shows the Clock icon, a distinct icon from high urgency", () => {
    const { container } = render(<UrgencyBadge dueDate={isoDaysFromNow(60)} />);
    expect(container.querySelector("svg.lucide-clock")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-triangle-alert")).not.toBeInTheDocument();
  });

  it("a low-urgency (far off) deadline shows a third, distinct icon", () => {
    const { container } = render(<UrgencyBadge dueDate={isoDaysFromNow(200)} />);
    expect(container.querySelector("svg.lucide-calendar-check")).toBeInTheDocument();
  });
});
