"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GridChart from "@/components/GridChart";
import NutritionRings, { type Nutrition } from "@/components/NutritionRings";
import WaterTracker from "@/components/WaterTracker";
import { type WaterHistoryDay } from "@/components/WaterHistoryChart";
import { useAuth } from "@/components/AuthProvider";

type SleepStages = {
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
};

type Activity = {
  distanceKm?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  floors?: number;
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
  activity?: Activity;
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

type Point = { date: string; value: number };

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
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

/** A compact labeled stat used in the "Today" activity grid. */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
        {value}
        {sub && <span className="ml-1 text-[11px] font-normal text-muted">{sub}</span>}
      </p>
    </div>
  );
}

/** Latest / average / min / max summary row shown above each trend chart. */
function SummaryStats({
  values,
  unit,
  decimals = 1,
}: {
  values: number[];
  unit: string;
  decimals?: number;
}) {
  if (values.length === 0) return null;
  const fmt = (n: number) => `${n.toFixed(decimals)}${unit}`;
  const avg = average(values.slice(-7)) ?? 0;
  const items: Array<[string, string]> = [
    ["Latest", fmt(values[values.length - 1])],
    ["7-day avg", fmt(avg)],
    ["Min", fmt(Math.min(...values))],
    ["Max", fmt(Math.max(...values))],
  ];
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

/** A divider-led section: uppercase label, large current value, its details, then a gridded trend. */
function TrendSection({
  label,
  accent,
  unit,
  chartUnit,
  current,
  currentUnit,
  points,
  loading,
  error,
  decimals = 1,
  format,
  target,
  targetLabel,
  children,
}: {
  label: string;
  accent: string;
  unit: string;
  chartUnit?: string;
  current: string;
  currentUnit?: string;
  points: Point[];
  loading: boolean;
  error?: string;
  decimals?: number;
  format?: (v: number) => string;
  target?: number;
  targetLabel?: string;
  children?: React.ReactNode;
}) {
  const values = points.map((p) => p.value);
  return (
    <section className="border-t border-border pt-8">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>

      <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
        {current}
        {currentUnit && <span className="ml-1.5 text-base font-normal text-muted">{currentUnit}</span>}
      </p>

      {children}

      <div className="mt-6">
        {loading && <div className="h-40 animate-pulse rounded-lg bg-hover" />}
        {error && <p className="text-sm text-muted">{error}</p>}
        {!loading && !error && points.length === 0 && (
          <p className="text-sm text-muted">
            No history yet — open the app on a few different days and a trend will appear here.
          </p>
        )}
        {points.length > 0 && (
          <>
            <SummaryStats values={values} unit={unit} decimals={decimals} />
            <GridChart
              points={points}
              color={accent}
              unit={chartUnit ?? unit}
              format={format}
              target={target}
              targetLabel={targetLabel}
            />
          </>
        )}
      </div>
    </section>
  );
}

/** Comprehensive health dashboard — sleep, nutrition, activity and their trends.
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
  const activity = snapshot?.activity;
  const historyLoading = historyState === null && Boolean(token);
  const historyError = historyState?.error;
  const waterHistoryLoading = waterHistoryState === null && Boolean(token);
  const waterHistoryError = waterHistoryState?.error;

  const sleepPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.sleepHours }))
        .filter((p): p is Point => p.value !== null),
    [historyState],
  );
  const rhrPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.restingHeartRate }))
        .filter((p): p is Point => p.value !== null),
    [historyState],
  );
  const stepsPoints = useMemo(
    () =>
      (historyState?.days ?? [])
        .map((d) => ({ date: d.date, value: d.steps }))
        .filter((p): p is Point => p.value !== null),
    [historyState],
  );
  const waterPoints = useMemo(
    () =>
      (waterHistoryState?.days ?? []).slice(-30).map((d) => ({
        date: d.date,
        value: Math.round((d.totalMl / 1000) * 100) / 100,
      })),
    [waterHistoryState],
  );

  const notConnected = snapshotState && !snapshotState.configured;

  const activityTiles: Array<{ label: string; value: string; sub?: string }> = [];
  if (snapshot?.steps !== undefined)
    activityTiles.push({ label: "Steps", value: snapshot.steps.toLocaleString() });
  if (activity?.distanceKm !== undefined)
    activityTiles.push({ label: "Distance", value: activity.distanceKm.toFixed(2), sub: "km" });
  if (activity?.activeMinutes !== undefined)
    activityTiles.push({ label: "Active", value: `${activity.activeMinutes}`, sub: "min" });
  if (activity?.caloriesBurned !== undefined)
    activityTiles.push({ label: "Burned", value: activity.caloriesBurned.toLocaleString(), sub: "kcal" });
  if (activity?.floors !== undefined)
    activityTiles.push({ label: "Floors", value: `${activity.floors}` });

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
              {/* Nutrition & Water — grouped: both are today's fuel/hydration */}
              <section>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Nutrition &amp; Water · Today
                </p>
                <div className="mt-5">
                  {snapshotState === null ? (
                    <div className="flex justify-center py-2">
                      <div className="h-32 w-32 animate-pulse rounded-full bg-hover" />
                    </div>
                  ) : (
                    <NutritionRings nutrition={snapshot?.nutrition} />
                  )}
                </div>
                {/* Water lives right here with nutrition, not off on its own */}
                <div className="mt-2">
                  <WaterTracker />
                </div>
              </section>

              {/* Activity snapshot — more of what the health app tracks each day */}
              {activityTiles.length > 0 && (
                <section className="border-t border-border pt-8">
                  <p className="text-[11px] uppercase tracking-wider text-muted">Activity · Today</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {activityTiles.map((t) => (
                      <StatTile key={t.label} label={t.label} value={t.value} sub={t.sub} />
                    ))}
                  </div>
                </section>
              )}

              {/* Sleep */}
              <TrendSection
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
                      {snapshot.sleep.minutesToFallAsleep !== undefined && (
                        <> · {Math.round(snapshot.sleep.minutesToFallAsleep)}m to fall asleep</>
                      )}
                      {snapshot.sleep.minutesAwake !== undefined && (
                        <> · {Math.round(snapshot.sleep.minutesAwake)}m awake</>
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
              </TrendSection>

              {/* Steps */}
              <TrendSection
                label="Steps · Today"
                accent="#0ea5e9"
                unit=""
                current={snapshot?.steps !== undefined ? snapshot.steps.toLocaleString() : "—"}
                points={stepsPoints}
                loading={historyLoading}
                error={historyError}
                decimals={0}
                format={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`)}
              />

              {/* Resting heart rate */}
              <TrendSection
                label="Resting heart rate"
                accent="#ef4444"
                unit=" bpm"
                chartUnit=""
                current={snapshot?.restingHeartRate ? `${snapshot.restingHeartRate}` : "—"}
                currentUnit={snapshot?.restingHeartRate ? "bpm" : undefined}
                points={rhrPoints}
                loading={historyLoading}
                error={historyError}
                decimals={0}
                format={(v) => `${Math.round(v)}`}
              />

              {/* Water history — now a gridded, labeled trend with a 2L goal line */}
              <TrendSection
                label="Water · Last 30 days"
                accent="#0891b2"
                unit=" L"
                chartUnit=" L"
                current={waterPoints.length ? `${waterPoints[waterPoints.length - 1].value.toFixed(2)}` : "—"}
                currentUnit={waterPoints.length ? "L today" : undefined}
                points={waterPoints}
                loading={waterHistoryLoading}
                error={waterHistoryError}
                decimals={2}
                format={(v) => v.toFixed(1)}
                target={2}
                targetLabel="2 L goal"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
