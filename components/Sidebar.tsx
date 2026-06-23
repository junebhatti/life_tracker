"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/data";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5">
      <div className="px-2 pb-6">
        <h1 className="text-[15px] font-semibold leading-tight text-foreground">
          Operations
        </h1>
        <p className="text-[11px] uppercase tracking-wide text-muted">
          Life Tracker
        </p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-hover font-medium text-foreground"
                  : "text-neutral-600 hover:bg-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
