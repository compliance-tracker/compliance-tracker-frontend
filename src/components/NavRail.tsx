import { NavLink, useParams } from "react-router-dom";
import { Building2, CalendarDays, LayoutDashboard, LogOut, Pencil, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavRailProps {
  onLogout: () => void;
}

// The persistent dark "harbour" sidebar (Harbour Ledger design, issue #59/#61) - fixed navy in
// both light/dark theme (--rail-* tokens in index.css never theme-swap), unlike every other
// surface in the app. Only real, working nav items are shown - no Calendar/Notifications/
// Account/Admin entries yet, since those pages don't exist until their own later steps (a nav
// rail full of dead links would be worse than a shorter honest one).
export function NavRail({ onLogout }: NavRailProps) {
  const { id } = useParams<{ id: string }>();

  return (
    <nav className="flex flex-col gap-1 border-r border-rail-border bg-rail-bg p-3.5">
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-brass text-brass-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="font-serif text-[15.5px] font-semibold text-rail-fg">Compliance Tracker</span>
      </div>

      <NavCaption first>Businesses</NavCaption>
      <RailLink to="/businesses" icon={Building2}>
        Businesses
      </RailLink>
      <RailLink to="/calendar" icon={CalendarDays}>
        Calendar
      </RailLink>

      <NavCaption>Selected business</NavCaption>
      {/* Labeled "Overview", not "Work passes" - this page shows DeadlinesPanel too (issue #61's
          deliberate combining of the two, since the redesigned IA has no separate per-business
          deadlines page). "Work passes" undersold what's actually there (issue #65). */}
      <RailLink to={id ? `/businesses/${id}` : null} icon={LayoutDashboard}>
        Overview
      </RailLink>
      <RailLink to={id ? `/businesses/${id}/edit` : null} icon={Pencil}>
        Edit business
      </RailLink>

      {/* The mockup puts "Log out" on its Account page instead - that page doesn't exist yet
          (its own later step), and dropping the ability to log out entirely in the meantime
          isn't acceptable just because the "real" home for it isn't built. Pinned to the
          bottom of the rail as a placeholder location, to move once Account ships. */}
      <button
        type="button"
        onClick={onLogout}
        className="mt-auto flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2.5 text-[13.5px] font-medium text-rail-fg-muted hover:bg-white/6 hover:text-rail-fg"
      >
        <LogOut className="h-[15px] w-[15px] shrink-0" />
        Log out
      </button>
    </nav>
  );
}

function NavCaption({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn("px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-white/32 uppercase", first ? "pt-0" : "pt-3.5")}>
      {children}
    </div>
  );
}

interface RailLinkProps {
  to: string | null;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function RailLink({ to, icon: Icon, children }: RailLinkProps) {
  const baseClasses = "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2.5 text-[13.5px] font-medium";

  // Disabled (not a real link) when there's no selected business yet - e.g. arriving straight at
  // /businesses with nothing chosen. A muted, unclickable row communicates "pick a business
  // first" better than a link that would 404 or silently do nothing.
  if (!to) {
    return (
      <span className={cn(baseClasses, "cursor-not-allowed text-rail-fg-muted opacity-50")}>
        <Icon className="h-[15px] w-[15px] shrink-0" />
        {children}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          baseClasses,
          isActive
            ? "bg-rail-active-bg text-rail-active-fg"
            : "text-rail-fg-muted hover:bg-white/6 hover:text-rail-fg",
        )
      }
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      {children}
    </NavLink>
  );
}
