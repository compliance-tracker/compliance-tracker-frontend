import { useEffect, useState } from "react";
import { Menu, ShieldCheck } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AmbientBackground, type AmbientTint } from "@/components/AmbientBackground";
import { NavRail } from "@/components/NavRail";
import { cn } from "@/lib/utils";
import type { Business } from "@/lib/types";

// Shape passed down to every routed page via <Outlet context={...}/> / useOutletContext() -
// avoids introducing a separate React Context API just for this, since react-router already has
// a built-in mechanism for exactly "pass shell-level data down to whichever child route is
// currently mounted" (issue #61). onLogout lives here (not a separate Shell prop) now that
// AccountPage - a routed page reached via Outlet - is what actually calls it (issue #67);
// NavRail no longer needs it at all, since its own temporary Log out button moved to that page.
export interface ShellContext {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  onCreated: (business: Business) => void;
  onUpdated: (business: Business) => void;
  onDeleted: (businessId: number) => void;
  onLogout: () => void;
}

interface ShellProps {
  context: ShellContext;
}

// Which ambient tint (issue #63) a given path gets - mirrors the mockup's
// body[data-section="workpass"|"editbiz"|"calendar"] selectors. Anything not listed (the
// Businesses list) stays the default teal.
function tintForPath(pathname: string): AmbientTint {
  if (pathname === "/calendar") return "brick";
  if (/^\/businesses\/[^/]+/.test(pathname)) return "brass";
  return "teal";
}

export function Shell({ context }: ShellProps) {
  const { pathname } = useLocation();
  // Off-canvas nav rail below lg (issue #71) - the rail's own layout stays exactly the same
  // markup, just repositioned via responsive classes rather than a second implementation.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close automatically on navigation - otherwise the drawer would stay open covering the page
  // it just navigated to, since clicking a nav link doesn't itself close anything.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-background lg:grid lg:grid-cols-[220px_1fr]">
      <AmbientBackground tint={tintForPath(pathname)} />

      {/* Mobile topbar - the nav rail's own brand mark, shown here instead since the rail itself
          is off-canvas by default below lg. */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-card text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="font-serif text-sm font-semibold">Compliance Tracker</span>
        </div>
      </div>

      {/* Backdrop - closes the drawer on tap outside it, only rendered (and only relevant) below
          lg, since the rail is always visible in normal document flow at lg+. */}
      {mobileNavOpen && (
        <div
          aria-hidden
          data-testid="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
        />
      )}

      <NavRail
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] max-w-[82vw] transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:transition-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      />

      <main className="relative z-10 max-w-[1080px] space-y-4 p-8">
        {context.error && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {context.error}
          </p>
        )}
        <Outlet context={context} />
      </main>
    </div>
  );
}
