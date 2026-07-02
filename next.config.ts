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
  async headers() {
    // Never cache the PWA's HTML shell, so every open/refresh fetches the
    // latest deployment (which then pulls the newest hashed JS bundle). The
    // hashed bundles themselves are content-addressed, so cache them forever.
    return [
      {
        source: "/app",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/app/index.html",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/app/_expo/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
