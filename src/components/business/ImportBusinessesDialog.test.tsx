import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportBusinessesDialog } from "./ImportBusinessesDialog";
import { api, ApiRequestError } from "@/lib/api";
import type { Business } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { createBusiness: vi.fn() } };
});

function csvFile(content: string, name = "businesses.csv") {
  return new File([content], name, { type: "text/csv" });
}

function businessFor(name: string): Business {
  return { id: Math.floor(Math.random() * 100000), name, financialYearEnd: "2026-12-31", gstRegistered: false, leadTimeDays: 14, incorporationDate: null };
}

beforeEach(() => {
  vi.mocked(api.createBusiness).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function openAndUpload(content: string) {
  const user = userEvent.setup();
  render(<ImportBusinessesDialog onCreated={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Import CSV" }));
  const input = screen.getByLabelText("CSV file");
  await user.upload(input, csvFile(content));
  return user;
}

describe("ImportBusinessesDialog - parsing", () => {
  it("shows a header error when a required column is missing", async () => {
    await openAndUpload("Name\r\nAcme Pte Ltd");
    expect(await screen.findByText(/Missing required column/)).toBeInTheDocument();
  });

  it("shows a per-row error for a bad date, without blocking valid rows", async () => {
    await openAndUpload(
      "Name,Financial Year End\r\nAcme Pte Ltd,2026-12-31\r\nBad Co,not-a-date",
    );

    expect(await screen.findByText(/must be YYYY-MM-DD/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import 1 business" })).toBeInTheDocument();
  });

  it("disables the import button when there are zero valid rows", async () => {
    await openAndUpload("Name,Financial Year End\r\nMissing FYE,");
    expect(await screen.findByText(/Missing Name or Financial Year End/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import/ })).toBeDisabled();
  });
});

describe("ImportBusinessesDialog - import", () => {
  it("creates each valid row through the real API and calls onCreated for each", async () => {
    vi.mocked(api.createBusiness).mockImplementation(async (b) => businessFor(b.name));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<ImportBusinessesDialog onCreated={onCreated} />);
    await user.click(screen.getByRole("button", { name: "Import CSV" }));
    await user.upload(
      screen.getByLabelText("CSV file"),
      csvFile("Name,Financial Year End\r\nAcme Pte Ltd,2026-12-31\r\nBeta Pte Ltd,2026-06-30"),
    );

    await user.click(await screen.findByRole("button", { name: "Import 2 businesses" }));

    expect(api.createBusiness).toHaveBeenCalledTimes(2);
    expect(api.createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme Pte Ltd", financialYearEnd: "2026-12-31" }),
    );
    expect(onCreated).toHaveBeenCalledTimes(2);
  });

  it("shows the real backend error for a row that fails, without losing the others", async () => {
    vi.mocked(api.createBusiness).mockImplementation(async (b) => {
      if (b.name === "Bad Co") {
        throw new ApiRequestError("Financial year end is more than 18 months after incorporation.", "BAD_REQUEST");
      }
      return businessFor(b.name);
    });
    const user = userEvent.setup();
    render(<ImportBusinessesDialog onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import CSV" }));
    await user.upload(
      screen.getByLabelText("CSV file"),
      csvFile("Name,Financial Year End\r\nAcme Pte Ltd,2026-12-31\r\nBad Co,2026-06-30"),
    );

    await user.click(await screen.findByRole("button", { name: "Import 2 businesses" }));

    expect(await screen.findByText("Financial year end is more than 18 months after incorporation.")).toBeInTheDocument();
    expect(await screen.findByText("Imported")).toBeInTheDocument();
  });
});
