import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route phones to the mobile PWA. Someone opening the site root on a phone gets
// the app experience (/app); everything else — the desktop site, deep links,
// the API — is left alone. Desktop users hitting / get the full website.
export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  if (isPhone) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Only the site root — never /app, /api, static assets, or deep links.
export const config = {
  matcher: ["/"],
};
