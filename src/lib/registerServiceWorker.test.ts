import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  let registerMock: ReturnType<typeof vi.fn>;
  let originalServiceWorker: unknown;

  beforeEach(() => {
    registerMock = vi.fn().mockResolvedValue(undefined);
    originalServiceWorker = (navigator as unknown as Record<string, unknown>).serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", { value: originalServiceWorker, configurable: true });
    vi.restoreAllMocks();
  });

  it("does not register in a non-production build", () => {
    registerServiceWorker(false);
    window.dispatchEvent(new Event("load"));

    expect(registerMock).not.toHaveBeenCalled();
  });

  it("registers /sw.js on window load, in a production build", () => {
    registerServiceWorker(true);
    window.dispatchEvent(new Event("load"));

    expect(registerMock).toHaveBeenCalledWith("/sw.js");
  });

  it("does nothing when the browser has no serviceWorker support at all", () => {
    Object.defineProperty(navigator, "serviceWorker", { value: undefined, configurable: true });

    expect(() => registerServiceWorker(true)).not.toThrow();
  });
});
