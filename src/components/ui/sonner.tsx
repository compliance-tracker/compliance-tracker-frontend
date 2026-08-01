import { Toaster as Sonner, type ToasterProps } from "sonner";
import { getTheme } from "@/lib/theme";

// Adapted from shadcn's own sonner registry entry, which assumes next-themes (a Next.js-only
// package) - this app is a plain Vite SPA with its own theme.ts (issue #20), so the theme prop
// is read from that instead. Not reactive to a same-session theme change (Sonner has no
// prop-driven live update short of remounting) - acceptable since a toast is transient and the
// next one fires after any theme switch anyway.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme={getTheme()}
      className="toaster group print:hidden"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
