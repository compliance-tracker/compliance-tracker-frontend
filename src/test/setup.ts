// Adds jest-dom's matchers (toBeInTheDocument, toHaveTextContent, etc.) to Vitest's expect -
// runs once before every test file, via vite.config.ts's test.setupFiles.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library normally auto-registers this via a global afterEach, but that
// detection relies on Vitest's `globals` mode being on - deliberately off here (see
// vite.config.ts) so test files import describe/it/expect explicitly instead. Without this,
// each render() in a test file stacks on top of the previous one instead of unmounting it,
// silently accumulating duplicate elements across tests in the same file.
afterEach(() => {
  cleanup();
});
