// Server-side helper for reading the user's Google Health data — sleep,
// resting heart rate, and steps, synced in from Fitbit/Android devices.
// Replaces the legacy Fitbit Web API, which Google is decommissioning in
// September 2026 in favor of this API. Single-user app: credentials live in
// env vars, no database. See app/api/health/auth and app/api/health/callback
// for how GOOGLE_HEALTH_REFRESH_TOKEN gets minted.
//
// The Health API is very new; exact field names for resting heart rate and
// sleep sessions are best-effort (Google's reference docs were unreachable
// while building this). Each metric is fetched and parsed independently so a
// wrong guess just omits that one field instead of breaking the snapshot.

import { refreshGoogleAccessToken } from "@/lib/googleOAuth";

const API_BASE = "https://health.googleapis.com/v4";

/** Civil-day window to look back for "last night's" sleep, regardless of what time it is now. */
const SLEEP_WINDOW_DAYS = 2;
/** Resting heart rate is typically a once-a-day measurement. */
const RESTING_HR_WINDOW_DAYS = 7;

export function googleHealthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_HEALTH_REFRESH_TOKEN,
  );
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_HEALTH_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("Google Health is not configured");
  }
  return refreshGoogleAccessToken(refreshToken);
}

async function healthFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google Health request failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<T>;
}

type CivilDate = { year: number; month: number; day: number };

/** Local Y/M/D for civil-time-based endpoints/filters (not UTC). */
function civilDateParts(date: Date, timeZone: string): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Shifts a civil date by N days, correctly rolling over month/year boundaries. */
function shiftCivilDate(parts: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function civilDateString(parts: CivilDate): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

const TIME_ZONE = process.env.GOOGLE_HEALTH_TIMEZONE || "America/Denver";

/** Recursively searches an object's values for the first key matching any candidate field name. */
function findNestedNumber(value: unknown, candidates: string[]): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of candidates) {
    const v = record[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  for (const nested of Object.values(record)) {
    const found = findNestedNumber(nested, candidates);
    if (found !== undefined) return found;
  }
  return undefined;
}

type RollupResponse = {
  rollupDataPoints?: Array<{ steps?: { countSum?: string } }>;
};

async function fetchStepsToday(accessToken: string): Promise<number | undefined> {
  const today = civilDateParts(new Date(), TIME_ZONE);
  const tomorrow = shiftCivilDate(today, 1);

  const data = await healthFetch<RollupResponse>(
    accessToken,
    "/users/me/dataTypes/steps/dataPoints:dailyRollUp",
    {
      method: "POST",
      body: JSON.stringify({
        range: {
          start: { date: today },
          end: { date: tomorrow },
        },
        windowSizeDays: 1,
      }),
    },
  );

  const countSum = data.rollupDataPoints?.[0]?.steps?.countSum;
  if (countSum === undefined) return undefined;
  const n = Number(countSum);
  return Number.isFinite(n) ? n : undefined;
}

type ReconcileResponse = { dataPoints?: Record<string, unknown>[] };

async function fetchRestingHeartRate(accessToken: string): Promise<number | undefined> {
  const today = civilDateParts(new Date(), TIME_ZONE);
  const start = civilDateString(shiftCivilDate(today, -(RESTING_HR_WINDOW_DAYS - 1)));
  const end = civilDateString(shiftCivilDate(today, 1));

  const params = new URLSearchParams({
    filter: `daily_resting_heart_rate.interval.civil_start_time >= "${start}" AND daily_resting_heart_rate.interval.civil_start_time < "${end}"`,
    pageSize: "25",
  });

  const data = await healthFetch<ReconcileResponse>(
    accessToken,
    `/users/me/dataTypes/daily-resting-heart-rate/dataPoints:reconcile?${params.toString()}`,
  );

  const points = data.dataPoints ?? [];
  if (points.length === 0) return undefined;

  return findNestedNumber(points[0], ["beatsPerMinute", "bpm", "value", "restingHeartRate"]);
}

export type SleepSummary = { hours: number; start: string; end: string };

async function fetchRecentSleep(accessToken: string): Promise<SleepSummary | undefined> {
  const today = civilDateParts(new Date(), TIME_ZONE);
  const start = civilDateString(shiftCivilDate(today, -(SLEEP_WINDOW_DAYS - 1)));
  const end = civilDateString(shiftCivilDate(today, 1));

  const params = new URLSearchParams({
    filter: `sleep.interval.civil_start_time >= "${start}" AND sleep.interval.civil_start_time < "${end}"`,
    pageSize: "20",
    dataSourceFamily: "users/me/dataSourceFamilies/google-wearables",
  });

  const data = await healthFetch<ReconcileResponse>(
    accessToken,
    `/users/me/dataTypes/sleep/dataPoints:reconcile?${params.toString()}`,
  );

  const sessions = (data.dataPoints ?? [])
    .map((p) => {
      const sleep = (p.sleep ?? p) as Record<string, unknown>;
      const interval = sleep.interval as { startTime?: string; endTime?: string } | undefined;
      const minutes = findNestedNumber(sleep.summary, ["minutesAsleep", "minutesInSleepPeriod"]);
      if (minutes === undefined || !interval?.startTime || !interval?.endTime) return undefined;
      return { minutes, start: interval.startTime, end: interval.endTime };
    })
    .filter((s): s is { minutes: number; start: string; end: string } => Boolean(s));

  if (sessions.length === 0) return undefined;

  // The longest session in the window is treated as the main sleep, so a
  // short nap doesn't get reported in place of last night's sleep.
  sessions.sort((a, b) => b.minutes - a.minutes);
  const longest = sessions[0];
  return {
    hours: Math.round((longest.minutes / 60) * 10) / 10,
    start: longest.start,
    end: longest.end,
  };
}

export type HealthSnapshot = {
  steps?: number;
  restingHeartRate?: number;
  sleep?: SleepSummary;
};

/** Fetches today's steps, latest resting heart rate, and last sleep session in parallel. */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  // Fetched outside the per-metric try/catches below so a bad/expired
  // refresh token surfaces as a real connectivity error instead of silently
  // returning an empty snapshot.
  const accessToken = await getAccessToken();

  const [steps, restingHeartRate, sleep] = await Promise.all([
    fetchStepsToday(accessToken).catch((error) => {
      console.error("Google Health: steps fetch failed:", error);
      return undefined;
    }),
    fetchRestingHeartRate(accessToken).catch((error) => {
      console.error("Google Health: resting heart rate fetch failed:", error);
      return undefined;
    }),
    fetchRecentSleep(accessToken).catch((error) => {
      console.error("Google Health: sleep fetch failed:", error);
      return undefined;
    }),
  ]);

  return { steps, restingHeartRate, sleep };
}

export type HealthStatus = {
  connected: boolean;
  snapshot?: HealthSnapshot;
  error?: string;
};

/** For the Settings page's "test sync" button. */
export async function checkHealthStatus(): Promise<HealthStatus> {
  try {
    const snapshot = await fetchHealthSnapshot();
    return { connected: true, snapshot };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
