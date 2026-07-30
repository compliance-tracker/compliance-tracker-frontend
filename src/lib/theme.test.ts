import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getStoredTheme, getTheme, setTheme } from "./theme";

function mockPrefersDark(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
});

describe("getStoredTheme", () => {
  it("returns null when nothing has been explicitly chosen yet", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("returns the stored value once a theme has been set", () => {
    setTheme("dark");
    expect(getStoredTheme()).toBe("dark");
  });
});

describe("getTheme", () => {
  it("falls back to the OS preference when nothing has been explicitly chosen", () => {
    mockPrefersDark(true);
    expect(getTheme()).toBe("dark");

    mockPrefersDark(false);
    expect(getTheme()).toBe("light");
  });

  it("an explicit stored choice overrides the OS preference", () => {
    mockPrefersDark(true);
    setTheme("light");

    expect(getTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("adds the dark class for 'dark'", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class for 'light'", () => {
    document.documentElement.classList.add("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("setTheme", () => {
  it("persists the choice and applies it to the document at the same time", () => {
    setTheme("dark");

    expect(localStorage.getItem("compliance-tracker:theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
