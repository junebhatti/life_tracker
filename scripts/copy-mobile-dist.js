// Copies the exported Expo web app (mobile/dist, built with baseUrl "/app")
// into the Next.js public/app directory so the whole thing ships in the single
// Next.js Vercel deployment. Served at /app; the desktop site owns everything
// else and the API is same-origin.

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "mobile", "dist");
const dest = path.join(__dirname, "..", "public", "app");

if (!fs.existsSync(src)) {
  console.error(`Mobile build not found at ${src} — did "npm run build" in mobile/ run?`);
  process.exit(1);
}

// Start clean so removed files don't linger between deploys.
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied mobile app -> ${path.relative(process.cwd(), dest)}`);
