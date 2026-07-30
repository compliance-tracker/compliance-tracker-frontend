import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormError } from "./FormError";

describe("FormError (issue #26 - accessibility pass)", () => {
  it("renders as an ARIA alert, announced to assistive tech the moment it appears", () => {
    render(<FormError>Something went wrong.</FormError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});
