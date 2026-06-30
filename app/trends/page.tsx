"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TrendChart from "@/components/TrendChart";
import { useAuth } from "@/components/AuthProvider";

type HealthMetricsDay = {
  date: string;
  sleepHours: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

type HistoryResponse = { days?: HealthMetricsDay[]; error?: string };

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compares the average of the last 7 logged values against the 7 before that. */
function trendLabel(values: number[], unit: string, decimals = 1): string {
  if (values.length < 2) return "Not enough data yet";
  const recent = values.slice(-7);
  const prior = values.slice(-14, -7);
  const recentAvg = average(recent);
  const priorAvg = average(prior);
  if (recentAvg === undefined) return "Not enough data yet";
  if (priorAvg === undefined) return `Averaging ${recentAvg.toFixed(decimals)}${unit} recently`;
  const delta = recentAvg - priorAvg;
  if (Math.abs(delta) < 0.05) return `Holding steady around ${recentAvg.toFixed(decimals)}${unit}`;
  const direction = delta > 0 ? "up" : "down";
  return `${direction === "up" ? "Up" : "Down"} ${Math.abs(delta).toFixed(decimals)}${unit} vs. the prior week (now ${recentAvg.toFixed(decimals)}${unit})`;
}

function MetricSection({
  title,
  color,
  unit,
  days,
  pick,
}: {
  title: string;
  color: string;
  unit: string;
  days: HealthMetricsDay[];
  pick: (d: HealthMetricsDay) => number | null;
}) {
  const points = days
    .map((d) => ({ date: d.date, value: pick(d) }))
    .filter((p): p is { date: string; value: number } => p.value !== null);

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="text-xs text-muted">{points.length} days logged</span>
      </div>

      {points.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No data yet.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {trendLabel(
              points.map((p) => p.value),
              unit,
            )}
          </p>
          <div className="mt-4">
            <TrendChart points={points} color={color} unit={unit} />
          </div>
        </>
      )}
    </section>
  );
}

export default function TrendsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/health/history", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data: HistoryResponse) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) setState({ error: "Couldn't load trend data." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const days = state?.days ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Trends</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Trends</h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Sleep, resting heart rate, and steps over time, captured automatically each day the
            Health widget loads.
          </p>

          {state === null && (
            <div className="mt-8 flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-hover" />
              ))}
            </div>
          )}

          {state?.error && <p className="mt-6 text-sm text-muted">{state.error}</p>}

          {state && !state.error && days.length === 0 && (
            <p className="mt-6 text-sm text-muted">
              No history yet — open the app on a few different days and trends will appear here.
            </p>
          )}

          {state && !state.error && days.length > 0 && (
            <div className="mt-8 flex flex-col gap-5">
              <MetricSection
                title="Sleep"
                color="#a855f7"
                unit="h"
                days={days}
                pick={(d) => d.sleepHours}
              />
              <MetricSection
                title="Resting heart rate"
                color="#ef4444"
                unit=" bpm"
                days={days}
                pick={(d) => d.restingHeartRate}
              />
              <MetricSection
                title="Steps"
                color="#0ea5e9"
                unit=""
                days={days}
                pick={(d) => d.steps}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
