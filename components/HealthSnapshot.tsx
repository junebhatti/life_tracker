"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import { useAuth } from "./AuthProvider";

type Snapshot = {
  steps?: number;
  restingHeartRate?: number;
  sleep?: { hours: number; start: string; end: string };
};

type SnapshotResponse = {
  configured: boolean;
  snapshot?: Snapshot;
  error?: string;
};

const METRICS = [
  { key: "sleep", label: "Sleep" },
  { key: "restingHeartRate", label: "Resting HR" },
  { key: "steps", label: "Steps" },
] as const;

function formatValue(key: (typeof METRICS)[number]["key"], snapshot?: Snapshot) {
  if (key === "sleep") return snapshot?.sleep ? `${snapshot.sleep.hours}` : "—";
  if (key === "restingHeartRate")
    return snapshot?.restingHeartRate ? `${snapshot.restingHeartRate}` : "—";
  return snapshot?.steps !== undefined ? snapshot.steps.toLocaleString() : "—";
}

function formatUnit(key: (typeof METRICS)[number]["key"], snapshot?: Snapshot) {
  if (key === "sleep" && snapshot?.sleep) return "h";
  if (key === "restingHeartRate" && snapshot?.restingHeartRate) return "bpm";
  return undefined;
}

/** Sleep, resting heart rate, and steps synced in from Fitbit via Google Health. Click through for the full dashboard. */
export default function HealthSnapshot() {
  const [state, setState] = useState<SnapshotResponse | null>(null);
  const { session } = useAuth();
  const token = session?.access_token;

  useEffect(() => {
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Sending the session token (when signed in) lets the server record
    // today's metrics for the health history; the widget still works without it.
    fetch(`/api/health/snapshot?timezone=${encodeURIComponent(timezone)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json())
      .then((data: SnapshotResponse) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ configured: true, error: "Couldn't load health data." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state && !state.configured) {
    return (
      <section>
        <SectionHeading title="Health" />
        <p className="px-1 py-3 text-sm text-muted">
          Not connected.{" "}
          <a href="/api/health/auth" className="text-foreground underline underline-offset-2">
            Connect Google Health
          </a>
          .
        </p>
      </section>
    );
  }

  const snapshot = state?.snapshot;

  return (
    <section>
      <SectionHeading
        title="Health"
        action={
          <Link href="/health" className="transition-colors hover:text-foreground">
            View all →
          </Link>
        }
      />

      {state === null && (
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-hover" />
              <div className="h-5 w-10 animate-pulse rounded bg-hover" />
            </div>
          ))}
        </div>
      )}

      {state && state.error && <p className="px-1 py-3 text-sm text-muted">{state.error}</p>}

      {state && !state.error && (
        <Link href="/health" className="group block">
          <div className="flex flex-col">
            {METRICS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-baseline justify-between border-b border-border py-3 last:border-0"
              >
                <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
                <span className="text-xl font-medium leading-none text-foreground">
                  {formatValue(key, snapshot)}
                  {formatUnit(key, snapshot) && (
                    <span className="ml-1 text-xs font-normal text-muted">
                      {formatUnit(key, snapshot)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted transition-colors group-hover:text-foreground">
            Click any metric to go further →
          </p>
        </Link>
      )}
    </section>
  );
}
