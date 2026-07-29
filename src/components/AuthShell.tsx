import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

export interface AuthValueProp {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface AuthShellProps {
  brandHeading: string;
  brandDescription: string;
  // Only Login shows these - Forgot/Reset password keep the panel to just heading + description
  // (issue #69), matching the mockup, which doesn't repeat the value props on every auth screen.
  valueProps?: AuthValueProp[];
  children: ReactNode;
}

// The split-panel shell shared by Login, Forgot password, and Reset password (issue #69) - a
// fixed dark "harbour" brand panel (same navy as NavRail, never theme-swapped, since this is the
// product's "cover page") with its own dot-grid + rings/sweep motif, brass-tinted, distinct from
// the app's teal AmbientBackground; a plain form panel on the other side. Previously each of the
// three pages had its own near-duplicate of this layout (Login with an outdated blurred-blob
// decoration predating the Harbour Ledger palette, Forgot/Reset with a lighter centered-card
// treatment the mockup actually reserves for Verify Email specifically) - extracted once both
// gaps needed fixing at the same time.
export function AuthShell({ brandHeading, brandDescription, valueProps, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding panel - hidden on small screens, since there's no room for it alongside the
          form without both feeling cramped. */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-[oklch(0.96_0.006_200)] lg:flex"
        style={{
          background: "linear-gradient(160deg, oklch(0.3 0.045 200), var(--rail-bg) 60%, oklch(0.16 0.025 200))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(oklch(1 0 0 / 22%) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(circle at 30% 20%, black, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-52 -right-52 h-[560px] w-[560px] rounded-full motion-safe:animate-[sounding-breathe_9s_ease-in-out_infinite]"
          style={{
            background: "repeating-radial-gradient(circle at center, oklch(1 0 0 / 10%) 0 1.5px, transparent 1.5px 58px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-52 -right-52 h-[560px] w-[560px] rounded-full motion-safe:animate-[sounding-rotate_30s_linear_infinite]"
          style={{
            background: "conic-gradient(from 0deg, oklch(0.7 0.1 78 / 30%) 0deg, transparent 40deg 360deg)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-brass text-brass-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-serif text-[19px] font-semibold">Compliance Tracker</span>
        </div>

        <div className="relative max-w-md space-y-7">
          <div className="space-y-2.5">
            <h2 className="font-serif text-[30px] font-semibold text-balance tracking-tight">{brandHeading}</h2>
            <p className="max-w-[42ch] text-[14.5px] opacity-80">{brandDescription}</p>
          </div>

          {valueProps && (
            <div className="space-y-5">
              {valueProps.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-white/15">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold">{title}</p>
                    <p className="mt-px text-[12.5px] opacity-75">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="relative text-xs opacity-65">
          Built for Singapore SMEs — deadline rules sourced directly from ACRA, IRAS, and MOM.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="font-serif text-xl font-semibold tracking-tight">Compliance Tracker</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
