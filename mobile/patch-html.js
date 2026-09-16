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

// Self-heal bootstrap. The version-check / cache-purge logic normally lives in
// the main JS bundle — but if a stale cached index.html points at a bundle hash
// that 404s after a deploy, that bundle never loads, so the page is blank AND
// the recovery code can't run. This inline script does NOT depend on the
// bundle: it defines window.__ltRecover (purge caches + service workers, then
// one cache-busting reload, guarded against loops). It is fired from the main
// script tag's onerror below — a definitive "bundle failed to load" signal, so
// it never touches a working app.
const selfHeal = `<script>
(function(){
  var KEY="lt_selfheal";
  window.__ltRecover=function(){
    try{if(sessionStorage.getItem(KEY))return;sessionStorage.setItem(KEY,"1");}catch(e){}
    function go(){location.replace(location.pathname.replace(/[?#].*$/,"")+"?u="+Date.now());}
    try{
      var t=[];
      if(window.caches&&caches.keys)t.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x);}));}));
      if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)t.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister();}));}));
      Promise.all(t).then(go,go);
    }catch(e){go();}
  };
  // Clear the one-shot guard once the app has actually mounted, so a future
  // stale deploy can self-heal again.
  window.addEventListener("load",function(){
    setTimeout(function(){
      var r=document.getElementById("root");
      if(r&&r.childNodes&&r.childNodes.length>0){try{sessionStorage.removeItem(KEY);}catch(e){}}
    },12000);
  });
})();
</script>`;

// Inject the bootstrap before the main bundle and give that script an onerror
// so a failed bundle load (the stale-shell trap) recovers immediately.
html = html.replace(
  /<script (src="\/app\/_expo\/static\/js\/web\/index-[^"]+\.js") defer><\/script>/,
  `${selfHeal}\n    <script $1 defer onerror="window.__ltRecover&&window.__ltRecover()"></script>`,
);

fs.writeFileSync(file, html);
console.log("Patched dist/index.html with iOS PWA meta tags + self-heal bootstrap");

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
