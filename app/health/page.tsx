"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TrendChart from "@/components/TrendChart";
import NutritionRings, { type Nutrition } from "@/components/NutritionRings";
import WaterTracker from "@/components/WaterTracker";
import WaterHistoryChart, { type WaterHistoryDay } from "@/components/WaterHistoryChart";
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
  nutrition?: Nutrition;
};

type SnapshotResponse = { configured: boolean; snapshot?: Snapshot; error?: string };

type HealthMetricsDay = {
  date: string;
  sleepHours: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

type HistoryResponse = { days?: HealthMetricsDay[]; error?: string };

type WaterHistoryResponse = { days?: WaterHistoryDay[]; error?: string };

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
    <div className="mt-5">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
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
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGE_LABELS.map(({ key, label, color }) => {
          const minutes = stages[key];
          if (!minutes) return null;
          const pct = Math.round((minutes / total) * 100);
          return (
            <div key={key}>
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
              </div>
              <p className="mt-1 text-base font-medium text-foreground">
                {Math.round((minutes / 60) * 10) / 10}h
                <span className="ml-1 text-[11px] font-normal text-muted">{pct}%</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A divider-led section: uppercase label, large current value, then its trend over time. */
function MetricSection({
  label,
  accent,
  unit,
  current,
  currentUnit,
  points,
  loading,
  error,
  children,
}: {
  label: string;
  accent: string;
  unit: string;
  current: string;
  currentUnit?: string;
  points: { date: string; value: number }[];
  loading: boolean;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>

      <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
        {current}
        {currentUnit && <span className="ml-1.5 text-base font-normal text-muted">{currentUnit}</span>}
      </p>

      {children}

      <div className="mt-6">
        {loading && <div className="h-32 animate-pulse rounded-lg bg-hover" />}
        {error && <p className="text-sm text-muted">{error}</p>}
        {!loading && !error && points.length === 0 && (
          <p className="text-sm text-muted">
            No history yet — open the app on a few different days and a trend will appear here.
          </p>
        )}
        {points.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Trend · {points.length} days
            </p>
            <p className="mt-1 text-sm text-foreground">
              {trendLabel(
                points.map((p) => p.value),
                unit,
              )}
            </p>
            <div className="mt-4">
              <TrendChart points={points} color={accent} unit={unit} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Comprehensive health dashboard — sleep, nutrition, steps, resting HR and their trends.
 *  Reached by clicking any metric on the Today page; intentionally not in the left nav. */
export default function HealthPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [snapshotState, setSnapshotState] = useState<SnapshotResponse | null>(null);
  const [historyState, setHistoryState] = useState<HistoryResponse | null>(null);
  const [waterHistoryState, setWaterHistoryState] = useState<WaterHistoryResponse | null>(null);

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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/water/history", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data: WaterHistoryResponse) => {
        if (!cancelled) setWaterHistoryState(data);
      })
      .catch(() => {
        if (!cancelled) setWaterHistoryState({ error: "Couldn't load water history." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const snapshot = snapshotState?.snapshot;
  const historyLoading = historyState === null && Boolean(token);
  const historyError = historyState?.error;
  const waterDays = waterHistoryState?.days ?? [];
  const waterHistoryLoading = waterHistoryState === null && Boolean(token);
  const waterHistoryError = waterHistoryState?.error;

  const sleepPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.sleepHours }))
        .filter((p): p is { date: string; value: number } => p.value !== null),
    [historyState],
  );
  const rhrPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.restingHeartRate }))
        .filter((p): p is { date: string; value: number } => p.value !== null),
    [historyState],
  );
  const stepsPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.steps }))
        .filter((p): p is { date: string; value: number } => p.value !== null),
    [historyState],
  );

  const notConnected = snapshotState && !snapshotState.configured;

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

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Health</h1>
          <p className="mt-2 text-sm text-muted">
            Sleep, nutrition, and activity in one place — captured automatically each day the app
            loads.
          </p>

          {notConnected ? (
            <p className="mt-10 text-sm text-muted">
              Not connected.{" "}
              <a href="/api/health/auth" className="text-foreground underline underline-offset-2">
                Connect Google Health
              </a>
              .
            </p>
          ) : (
            <div className="mt-10 flex flex-col gap-8">
              {/* Nutrition */}
              <section>
                <p className="text-[11px] uppercase tracking-wider text-muted">Nutrition · Today</p>
                <div className="mt-5">
                  {snapshotState === null ? (
                    <div className="flex justify-center py-2">
                      <div className="h-32 w-32 animate-pulse rounded-full bg-hover" />
                    </div>
                  ) : (
                    <NutritionRings nutrition={snapshot?.nutrition} />
                  )}
                </div>
              </section>

              {/* Water — logged directly in-app, not from Google Health */}
              <WaterTracker />

              <section className="border-t border-border pt-8">
                <p className="text-[11px] uppercase tracking-wider text-muted">Water · Last 30 days</p>
                <div className="mt-6">
                  {waterHistoryLoading && <div className="h-32 animate-pulse rounded-lg bg-hover" />}
                  {waterHistoryError && <p className="text-sm text-muted">{waterHistoryError}</p>}
                  {!waterHistoryLoading && !waterHistoryError && waterDays.length === 0 && (
                    <p className="text-sm text-muted">
                      No history yet — log some water on a few different days and a trend will appear
                      here.
                    </p>
                  )}
                  {waterDays.length > 0 && <WaterHistoryChart days={waterDays} />}
                </div>
              </section>

              {/* Sleep */}
              <MetricSection
                label="Sleep · Last night"
                accent="#a855f7"
                unit="h"
                current={snapshot?.sleep ? `${snapshot.sleep.hours}` : "—"}
                currentUnit={snapshot?.sleep ? "hours" : undefined}
                points={sleepPoints}
                loading={historyLoading}
                error={historyError}
              >
                {snapshot?.sleep && (
                  <div className="mt-3">
                    <p className="text-sm text-muted">
                      {formatClockTime(snapshot.sleep.start)} – {formatClockTime(snapshot.sleep.end)}
                      {snapshot.sleep.efficiency !== undefined && (
                        <> · {Math.round(snapshot.sleep.efficiency)}% efficiency</>
                      )}
                    </p>
                    {snapshot.sleep.stages ? (
                      <SleepStageBreakdown stages={snapshot.sleep.stages} />
                    ) : (
                      <p className="mt-2 text-xs text-muted">
                        Sleep stage breakdown isn&apos;t available from this data source.
                      </p>
                    )}
                  </div>
                )}
              </MetricSection>

              {/* Steps */}
              <MetricSection
                label="Steps · Today"
                accent="#0ea5e9"
                unit=""
                current={snapshot?.steps !== undefined ? snapshot.steps.toLocaleString() : "—"}
                points={stepsPoints}
                loading={historyLoading}
                error={historyError}
              />

              {/* Resting heart rate */}
              <MetricSection
                label="Resting heart rate"
                accent="#ef4444"
                unit=" bpm"
                current={snapshot?.restingHeartRate ? `${snapshot.restingHeartRate}` : "—"}
                currentUnit={snapshot?.restingHeartRate ? "bpm" : undefined}
                points={rhrPoints}
                loading={historyLoading}
                error={historyError}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
