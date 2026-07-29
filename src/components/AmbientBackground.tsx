// The "depth-sounding" motif from the Harbour Ledger design (issue #59) - concentric rings plus
// a slow rotating conic sweep, fixed behind all page content. Replaces a generic blurred-blob
// gradient with something that reads as "quietly tracking something approaching," which is what
// this product actually does. Single teal tint for now (no per-section re-tint yet - that needs
// route-aware "which section am I on" state that doesn't exist until the nav-rail restructure).
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-56 -right-56 h-[640px] w-[640px] rounded-full opacity-50 motion-safe:animate-[sounding-breathe_9s_ease-in-out_infinite]"
        style={{
          background:
            "repeating-radial-gradient(circle at center, color-mix(in oklch, var(--primary) 16%, transparent) 0 1.5px, transparent 1.5px 64px)",
        }}
      />
      <div
        className="absolute -top-56 -right-56 h-[640px] w-[640px] rounded-full motion-safe:animate-[sounding-rotate_34s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, color-mix(in oklch, var(--primary) 26%, transparent) 0deg, transparent 40deg 360deg)",
        }}
      />
    </div>
  );
}
