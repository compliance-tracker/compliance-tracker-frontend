// Issue #20 - the dark palette has existed in index.css's own .dark block since the Harbour
// Ledger redesign (issue #59), deliberately populated ahead of any toggle existing - this is
// that toggle's logic. A plain class on <html> (the repo's existing .dark-class convention,
// see index.css's own comment), not a prefers-color-scheme media query alone, so a user's
// explicit choice can override their OS-level preference.

export type Theme = "light" | "dark";

const THEME_KEY = "compliance-tracker:theme";

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// null means "no explicit choice made yet" - distinct from getTheme()'s own return, which always
// resolves to a real Theme (falling back to the OS preference) for anything that just needs to
// render correctly right now.
export function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function getTheme(): Theme {
  return getStoredTheme() ?? (prefersDark() ? "dark" : "light");
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
