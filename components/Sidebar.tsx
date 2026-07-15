"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/data";
import { useAuth } from "./AuthProvider";

const ARIAL = "Arial, Helvetica, sans-serif";
const BLUE = "#2323e8";

// Compact Scrapbook-style nav — plain small Arial text on white, the active
// item bold + blue. The Scrapbook page's sidebar is the design prototype for
// the whole site, so this is that treatment applied globally.
export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: ARIAL,
    fontSize: 12.5,
    lineHeight: 1.3,
    fontWeight: active ? 700 : 400,
    color: active ? BLUE : "#222",
  });

  return (
    <aside
      className="flex shrink-0 flex-col"
      style={{ width: 140, padding: "20px 16px", borderRight: "1px solid #e2e2e2", background: "#fff" }}
    >
      <div style={{ paddingBottom: 22 }}>
        <h1 style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 13, letterSpacing: "0.02em", color: "#222", margin: 0 }}>
          Operations
        </h1>
        <p style={{ fontFamily: ARIAL, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a8783", margin: "3px 0 0" }}>
          Life Tracker
        </p>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          // External rewrites (e.g. /taste) need a real full-page load so the
          // server proxy serves the latest deploy — Next's client router would
          // serve a stale cached shell.
          if (item.external) {
            return (
              <a key={item.href} href={item.href} style={linkStyle(active)}>
                {item.label}
              </a>
            );
          }
          return (
            <Link key={item.href} href={item.href} style={linkStyle(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #e2e2e2", paddingTop: 14 }}>
        <Link href="/settings" style={linkStyle(pathname.startsWith("/settings"))}>
          Settings
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => signOut()}
            style={{ ...linkStyle(false), background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
          >
            Sign out
          </button>
        )}
      </nav>
    </aside>
  );
}
