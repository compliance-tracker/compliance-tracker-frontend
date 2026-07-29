import { Outlet } from "react-router-dom";
import { AmbientBackground } from "@/components/AmbientBackground";
import { NavRail } from "@/components/NavRail";
import type { Business } from "@/lib/types";

// Shape passed down to every routed page via <Outlet context={...}/> / useOutletContext() -
// avoids introducing a separate React Context API just for this, since react-router already has
// a built-in mechanism for exactly "pass shell-level data down to whichever child route is
// currently mounted" (issue #61).
export interface ShellContext {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  onCreated: (business: Business) => void;
  onUpdated: (business: Business) => void;
  onDeleted: (businessId: number) => void;
}

interface ShellProps {
  context: ShellContext;
  onLogout: () => void;
}

export function Shell({ context, onLogout }: ShellProps) {
  return (
    <div className="relative grid min-h-screen grid-cols-[220px_1fr] bg-background">
      <AmbientBackground />
      <NavRail onLogout={onLogout} />
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
