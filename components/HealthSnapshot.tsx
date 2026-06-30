"use client";

import { useEffect, useState } from "react";
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
  { key: "sleep", label: "Sleep", icon: "🌙" },
  { key: "restingHeartRate", label: "Resting HR", icon: "❤️" },
  { key: "steps", label: "Steps", icon: "👟" },
] as const;

function formatValue(key: (typeof METRICS)[number]["key"], snapshot?: Snapshot) {
  if (key === "sleep") return snapshot?.sleep ? `${snapshot.sleep.hours}h` : "—";
  if (key === "restingHeartRate")
    return snapshot?.restingHeartRate ? `${snapshot.restingHeartRate}` : "—";
  return snapshot?.steps !== undefined ? snapshot.steps.toLocaleString() : "—";
}

function formatUnit(key: (typeof METRICS)[number]["key"], snapshot?: Snapshot) {
  if (key === "restingHeartRate" && snapshot?.restingHeartRate) return "bpm";
  return undefined;
}

/** Sleep, resting heart rate, and steps synced in from Fitbit via Google Health. */
export default function HealthSnapshot() {
  const [state, setState] = useState<SnapshotResponse | null>(null);
  const { session } = useAuth();
  const token = session?.access_token;

  useEffect(() => {
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Sending the session token (when signed in) lets the server record
    // today's metrics for the Trends page; the widget still works without it.
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
        <p className="px-2 py-3 text-sm text-muted">
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
      <SectionHeading title="Health" />

      {state === null && (
        <div className="mt-2 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-hover" />
          ))}
        </div>
      )}

      {state && state.error && (
        <p className="px-2 py-3 text-sm text-muted">{state.error}</p>
      )}

      {state && !state.error && (
        <div className="mt-2 grid grid-cols-3 gap-3">
          {METRICS.map(({ key, label, icon }) => (
            <div
              key={key}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-hover/40 px-2 py-4 text-center"
            >
              <span className="text-xl" aria-hidden="true">
                {icon}
              </span>
              <span className="text-xl font-semibold leading-tight text-foreground">
                {formatValue(key, snapshot)}
                {formatUnit(key, snapshot) && (
                  <span className="ml-1 text-xs font-normal text-muted">
                    {formatUnit(key, snapshot)}
                  </span>
                )}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
