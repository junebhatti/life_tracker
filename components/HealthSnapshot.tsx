"use client";

import { useEffect, useState } from "react";
import SectionHeading from "./SectionHeading";

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

/** Sleep, resting heart rate, and steps synced in from Fitbit via Google Health. */
export default function HealthSnapshot() {
  const [state, setState] = useState<SnapshotResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/snapshot")
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
  }, []);

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
        <div className="flex flex-col gap-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-hover" />
          ))}
        </div>
      )}

      {state && state.error && (
        <p className="px-2 py-3 text-sm text-muted">{state.error}</p>
      )}

      {state && !state.error && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-hover">
            <span className="text-sm text-foreground">Sleep</span>
            <span className="text-sm text-muted">
              {snapshot?.sleep ? `${snapshot.sleep.hours}h` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-hover">
            <span className="text-sm text-foreground">Resting HR</span>
            <span className="text-sm text-muted">
              {snapshot?.restingHeartRate ? `${snapshot.restingHeartRate} bpm` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-hover">
            <span className="text-sm text-foreground">Steps</span>
            <span className="text-sm text-muted">
              {snapshot?.steps !== undefined ? snapshot.steps.toLocaleString() : "—"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
