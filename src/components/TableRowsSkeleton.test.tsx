import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Table } from "@/components/ui/table";
import { TableRowsSkeleton } from "./TableRowsSkeleton";

describe("TableRowsSkeleton (issue #29)", () => {
  it("renders the default 3 rows", () => {
    const { container } = render(
      <Table>
        <TableRowsSkeleton columns={4} />
      </Table>,
    );

    expect(container.querySelectorAll("tr")).toHaveLength(3);
  });

  it("renders the requested number of rows and columns", () => {
    const { container } = render(
      <Table>
        <TableRowsSkeleton columns={2} rows={5} />
      </Table>,
    );

    const rows = container.querySelectorAll("tr");
    expect(rows).toHaveLength(5);
    expect(rows[0].querySelectorAll("td")).toHaveLength(2);
  });

  it("every cell contains a real skeleton placeholder", () => {
    const { container } = render(
      <Table>
        <TableRowsSkeleton columns={3} rows={2} />
      </Table>,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
  });
});
