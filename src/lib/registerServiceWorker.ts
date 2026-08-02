// Issue #31 - registers public/sw.js, one of the two real requirements (alongside the web app
// manifest, see index.html) a browser checks before it'll offer to install this app as a PWA.
//
// PROD-only, deliberately - registering a service worker in dev would fight Vite's own dev
// server/HMR for control of every request, a well-known service-worker+Vite footgun. `isProd`
// defaults to the real build-time flag (false for `vite`/`vite preview`, true only for a real
// `vite build` output) - a parameter, not a bare `import.meta.env.PROD` read inside the
// function body, specifically so a test can pass either value directly instead of needing to
// stub Vite's own build-time env injection just to exercise both branches.
export function registerServiceWorker(isProd: boolean = import.meta.env.PROD): void {
  if (!("serviceWorker" in navigator)) return;
  if (!isProd) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err: unknown) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
