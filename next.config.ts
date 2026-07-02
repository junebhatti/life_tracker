import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The mobile PWA (Expo export) lives under public/app as a single-page app.
    // Serve its index.html for /app so the SPA boots; its own bundled assets
    // (/app/_expo, /app/assets, /app/favicon.ico) are real files and pass
    // straight through.
    return [
      { source: "/app", destination: "/app/index.html" },
      { source: "/app/", destination: "/app/index.html" },
    ];
  },
};

export default nextConfig;
