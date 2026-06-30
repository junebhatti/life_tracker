"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TrendChart from "@/components/TrendChart";
import { useAuth } from "@/components/AuthProvider";

type SleepStages = {
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
};

type Snapshot = {
  steps?: number;
  restingHeartRate?: number;
  sleep?: {
    hours: number;
    start: string;
    end: string;
    minutesAwake?: number;
    minutesToFallAsleep?: number;
    efficiency?: number;
    stages?: SleepStages;
  };
};

type SnapshotResponse = { configured: boolean; snapshot?: Snapshot; error?: string };

type HealthMetricsDay = {
  date: string;
  sleepHours: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

type HistoryResponse = { days?: HealthMetricsDay[]; error?: string };

const METRIC_CONFIG = {
  sleep: {
    title: "Sleep",
    accent: "#a855f7",
    unit: "h",
    pick: (d: HealthMetricsDay) => d.sleepHours,
    current: (s?: Snapshot) => (s?.sleep ? `${s.sleep.hours}h` : "—"),
  },
  "resting-heart-rate": {
    title: "Resting heart rate",
    accent: "#ef4444",
    unit: " bpm",
    pick: (d: HealthMetricsDay) => d.restingHeartRate,
    current: (s?: Snapshot) => (s?.restingHeartRate ? `${s.restingHeartRate} bpm` : "—"),
  },
  steps: {
    title: "Steps",
    accent: "#0ea5e9",
    unit: "",
    pick: (d: HealthMetricsDay) => d.steps,
    current: (s?: Snapshot) => (s?.steps !== undefined ? s.steps.toLocaleString() : "—"),
  },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

function isMetricKey(value: string | string[] | undefined): value is MetricKey {
  return typeof value === "string" && value in METRIC_CONFIG;
}

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

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const STAGE_LABELS: Array<{ key: keyof SleepStages; label: string; color: string }> = [
  { key: "deepMinutes", label: "Deep", color: "#6d28d9" },
  { key: "remMinutes", label: "REM", color: "#a855f7" },
  { key: "lightMinutes", label: "Light", color: "#c4b5fd" },
  { key: "awakeMinutes", label: "Awake", color: "#e5e7eb" },
];

function SleepStageBreakdown({ stages }: { stages: SleepStages }) {
  const total = STAGE_LABELS.reduce((sum, { key }) => sum + (stages[key] ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {STAGE_LABELS.map(({ key, label, color }) => {
          const minutes = stages[key];
          if (!minutes) return null;
          return (
            <div
              key={key}
              style={{ width: `${(minutes / total) * 100}%`, backgroundColor: color }}
              title={`${label}: ${minutes}m`}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGE_LABELS.map(({ key, label, color }) => {
          const minutes = stages[key];
          if (!minutes) return null;
          const pct = Math.round((minutes / total) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-xs text-foreground">
                  {Math.round((minutes / 60) * 10) / 10}h{" "}
                  <span className="text-muted">{label}</span>
                </p>
                <p className="text-[11px] text-muted">{pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HealthMetricPage() {
  const params = useParams<{ metric: string }>();
  const metric = isMetricKey(params.metric) ? params.metric : undefined;

  const { session } = useAuth();
  const token = session?.access_token;

  const [snapshotState, setSnapshotState] = useState<SnapshotResponse | null>(null);
  const [historyState, setHistoryState] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/health/snapshot?timezone=${encodeURIComponent(timezone)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json())
      .then((data: SnapshotResponse) => {
        if (!cancelled) setSnapshotState(data);
      })
      .catch(() => {
        if (!cancelled) setSnapshotState({ configured: true, error: "Couldn't load health data." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/health/history", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data: HistoryResponse) => {
        if (!cancelled) setHistoryState(data);
      })
      .catch(() => {
        if (!cancelled) setHistoryState({ error: "Couldn't load trend data." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const config = metric ? METRIC_CONFIG[metric] : undefined;

  const points = useMemo(() => {
    if (!config) return [];
    const days = historyState?.days ?? [];
    return days
      .map((d) => ({ date: d.date, value: config.pick(d) }))
      .filter((p): p is { date: string; value: number } => p.value !== null);
  }, [historyState, config]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            ← Today
          </Link>

          {!config ? (
            <p className="mt-6 text-sm text-muted">Unknown metric.</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: config.accent }}
                />
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {config.title}
                </h1>
              </div>

              <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
                {config.current(snapshotState?.snapshot)}
              </p>

              {metric === "sleep" && snapshotState?.snapshot?.sleep && (
                <div className="mt-6 rounded-lg border border-border p-4">
                  <p className="text-sm text-muted">
                    {formatClockTime(snapshotState.snapshot.sleep.start)} –{" "}
                    {formatClockTime(snapshotState.snapshot.sleep.end)}
                    {snapshotState.snapshot.sleep.efficiency !== undefined && (
                      <> · {Math.round(snapshotState.snapshot.sleep.efficiency)}% efficiency</>
                    )}
                  </p>

                  {snapshotState.snapshot.sleep.stages ? (
                    <SleepStageBreakdown stages={snapshotState.snapshot.sleep.stages} />
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Sleep stage breakdown isn&apos;t available from this data source.
                    </p>
                  )}
                </div>
              )}

              <section className="mt-8 rounded-lg border border-border p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium text-foreground">Trend</h2>
                  <span className="text-xs text-muted">{points.length} days logged</span>
                </div>

                {historyState === null && (
                  <div className="mt-4 h-32 animate-pulse rounded-lg bg-hover" />
                )}

                {historyState?.error && (
                  <p className="mt-3 text-sm text-muted">{historyState.error}</p>
                )}

                {historyState && !historyState.error && points.length === 0 && (
                  <p className="mt-3 text-sm text-muted">
                    No history yet — open the app on a few different days and a trend will appear
                    here.
                  </p>
                )}

                {points.length > 0 && (
                  <>
                    <p className="mt-1 text-xs text-muted">
                      {trendLabel(
                        points.map((p) => p.value),
                        config.unit,
                      )}
                    </p>
                    <div className="mt-4">
                      <TrendChart points={points} color={config.accent} unit={config.unit} />
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
