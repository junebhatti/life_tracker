const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "dist", "index.html");
let html = fs.readFileSync(file, "utf8");

const iosTags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Life Tracker" />
    <link rel="apple-touch-icon" href="/app/assets/icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />`;

// Replace the existing viewport tag and inject iOS tags after it
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  iosTags
);

fs.writeFileSync(file, html);
console.log("Patched dist/index.html with iOS PWA meta tags");

// Write the current build id so the running app can detect when a newer
// deployment exists and auto-reload into it (served no-store; see next.config).
const buildId = process.env.EXPO_PUBLIC_BUILD_ID || "dev";
fs.writeFileSync(
  path.join(__dirname, "dist", "version.json"),
  JSON.stringify({ buildId }),
);
console.log(`Wrote dist/version.json (buildId: ${buildId})`);

// Service worker whose only job is guaranteeing this installed PWA picks up
// new deployments. iOS treats an added-to-home-screen page like a native app
// process — reopening it often resumes a frozen/previous state instead of
// making a real network request, so plain Cache-Control headers alone can't
// reach it. A registered service worker changes that: the browser byte-compares
// this file on (roughly) every load, and CACHE_VERSION below changes on every
// deploy, so a new worker installs, takes over, and reloads the page exactly
// once (see the registration code in App.tsx).
const swSource = `
const CACHE_VERSION = ${JSON.stringify(buildId)};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first for navigations, so the HTML shell is always fetched fresh
// instead of served from any disk/HTTP cache. Everything else (hashed,
// immutable JS/asset bundles) is left untouched — this worker caches nothing.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => fetch(event.request))
    );
  }
});
`.trimStart();

fs.writeFileSync(path.join(__dirname, "dist", "sw.js"), swSource);
console.log(`Wrote dist/sw.js (CACHE_VERSION: ${buildId})`);
