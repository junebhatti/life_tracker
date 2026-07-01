const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "dist", "index.html");
let html = fs.readFileSync(file, "utf8");

const iosTags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Life Tracker" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />`;

// Replace the existing viewport tag and inject iOS tags after it
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  iosTags
);

fs.writeFileSync(file, html);
console.log("Patched dist/index.html with iOS PWA meta tags");
