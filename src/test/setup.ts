// Adds jest-dom's matchers (toBeInTheDocument, toHaveTextContent, etc.) to Vitest's expect -
// runs once before every test file, via vite.config.ts's test.setupFiles.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement these - Radix's Select (and other Radix primitives using pointer
// capture) call them internally, throwing "not a function" the moment a test opens one. A
// known, standard jsdom/Radix gap, not something this app's code does wrong - no-op polyfills
// are the accepted fix (see Radix's own testing docs).
if (typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.setPointerCapture === "undefined") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture === "undefined") {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}

// React Testing Library normally auto-registers this via a global afterEach, but that
// detection relies on Vitest's `globals` mode being on - deliberately off here (see
// vite.config.ts) so test files import describe/it/expect explicitly instead. Without this,
// each render() in a test file stacks on top of the previous one instead of unmounting it,
// silently accumulating duplicate elements across tests in the same file.
afterEach(() => {
  cleanup();
});
