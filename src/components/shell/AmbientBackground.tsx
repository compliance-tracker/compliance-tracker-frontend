export type AmbientTint = "teal" | "brass" | "brick";

// Tailwind class names, not raw color values, so each tint's rings/sweep pick up the actual
// --primary/--brass/--destructive CSS variables (which differ between light/dark) rather than a
// tint baked in as a fixed color.
const TINT_VARS: Record<AmbientTint, string> = {
  teal: "var(--primary)",
  brass: "var(--brass)",
  brick: "var(--destructive)",
};

interface AmbientBackgroundProps {
  tint?: AmbientTint;
}

// The "depth-sounding" motif from the Harbour Ledger design (issue #59) - concentric rings plus
// a slow rotating conic sweep, fixed behind all page content. Replaces a generic blurred-blob
// gradient with something that reads as "quietly tracking something approaching," which is what
// this product actually does. Re-tints per route section (issue #63) - teal by default, brass on
// the business detail/edit pages, brick-red on Calendar - so navigating actually feels
// different instead of one static wallpaper glued behind every screen. Deferred from #59 until
// real routes existed to know "which section am I on."
export function AmbientBackground({ tint = "teal" }: AmbientBackgroundProps) {
  const color = TINT_VARS[tint];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-56 -right-56 h-[640px] w-[640px] rounded-full opacity-50 motion-safe:animate-[sounding-breathe_9s_ease-in-out_infinite]"
        style={{
          background: `repeating-radial-gradient(circle at center, color-mix(in oklch, ${color} 16%, transparent) 0 1.5px, transparent 1.5px 64px)`,
        }}
      />
      <div
        className="absolute -top-56 -right-56 h-[640px] w-[640px] rounded-full motion-safe:animate-[sounding-rotate_34s_linear_infinite]"
        style={{
          background: `conic-gradient(from 0deg, color-mix(in oklch, ${color} 26%, transparent) 0deg, transparent 40deg 360deg)`,
        }}
      />
    </div>
  );
}
