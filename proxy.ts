import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed Middleware to "Proxy" (proxy.ts, exported `proxy`).
// Route phones to the mobile PWA: someone opening the site root on a phone gets
// the app experience (/app). Everything else — desktop site, deep links, the
// API — is untouched.
export function proxy(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  if (isPhone) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
