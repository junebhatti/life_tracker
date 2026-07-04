import { Platform } from "react-native";

// ── self-update ────────────────────────────────────────────────────────────
// The build this bundle was compiled from (Vercel commit SHA, stamped in at
// build time via mobile/patch-html.js -> version.json + sw.js).
export const LOCAL_BUILD_ID = process.env.EXPO_PUBLIC_BUILD_ID;

// Expose it so it's inspectable without logging in (used by the update test and
// handy for support).
if (typeof window !== "undefined") {
  (window as unknown as { __BUILD_ID__?: string }).__BUILD_ID__ = LOCAL_BUILD_ID ?? "dev";
}

/** Purge caches + any service worker, then cache-bust reload into the new build. */
export async function applyUpdate(): Promise<void> {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // best-effort — the cache-busting navigation below is the real fix
  }
  const base = window.location.pathname.replace(/[?#].*$/, "");
  window.location.replace(`${base}?u=${Date.now()}`);
}

/**
 * Compare the deployed build id (version.json, served no-store) to this bundle's
 * and reload into the new one if they differ. Returns true if an update was
 * found (and a reload has been kicked off), false otherwise — callers that also
 * want to show "you're up to date" can use the return value.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (!LOCAL_BUILD_ID || LOCAL_BUILD_ID === "local" || LOCAL_BUILD_ID === "dev") return false;
  try {
    const res = await fetch(`/app/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { buildId?: string };
    if (!data.buildId || data.buildId === LOCAL_BUILD_ID) return false;
    const store = window.sessionStorage;
    if (store && store.getItem("lt_updated_to") === data.buildId) return false;
    store?.setItem("lt_updated_to", data.buildId);
    await applyUpdate();
    return true;
  } catch {
    // offline or version.json missing — nothing to do
    return false;
  }
}

/**
 * Register the update service worker as a secondary safety net. Served with
 * `Service-Worker-Allowed: /app` (see next.config) and registered with scope
 * "/app" so it actually controls the /app page (default scope "/app/" would
 * NOT). Its only job is forcing navigations to hit the network (fresh shell),
 * so even if the browser ignores no-store the app can't get stuck on a stale
 * page. Reloads are driven by checkForUpdate (version.json), not by the worker,
 * to avoid a spurious reload when it first claims an uncontrolled page.
 */
export function registerServiceWorker(): void {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/app/sw.js", { scope: "/app" }).catch(() => {});
}
