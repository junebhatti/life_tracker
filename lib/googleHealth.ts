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
const MS_PER_HOUR = 60 * 60 * 1000;

/** Window to look back for "last night's" sleep, regardless of what time it is now. */
const SLEEP_WINDOW_HOURS = 48;
/** Resting heart rate is typically a once-a-day measurement. */
const RESTING_HR_WINDOW_HOURS = 7 * 24;

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

/** Local Y/M/D for the steps rollup, which is civil-time based (not UTC). */
function civilDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const TIME_ZONE = process.env.GOOGLE_HEALTH_TIMEZONE || "America/Denver";

type RollupResponse = {
  rollupDataPoints?: Array<{ steps?: { countSum?: string } }>;
};

async function fetchStepsToday(accessToken: string): Promise<number | undefined> {
  const today = civilDateParts(new Date(), TIME_ZONE);
  // Civil dates normalize day overflow correctly (e.g. day 31 + 1 rolls into next month).
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));

  const data = await healthFetch<RollupResponse>(
    accessToken,
    "/users/me/dataTypes/steps/dataPoints:dailyRollUp",
    {
      method: "POST",
      body: JSON.stringify({
        range: {
          start: { date: today },
          end: {
            date: {
              year: tomorrow.getUTCFullYear(),
              month: tomorrow.getUTCMonth() + 1,
              day: tomorrow.getUTCDate(),
            },
          },
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

type RestingHeartRatePoint = {
  restingHeartRate?: {
    beatsPerMinute?: number;
    bpm?: number;
    time?: { physicalTime?: string };
    sampleTime?: { physicalTime?: string };
  };
};
type RestingHeartRateResponse = { dataPoints?: RestingHeartRatePoint[] };

async function fetchRestingHeartRate(accessToken: string): Promise<number | undefined> {
  const since = new Date(Date.now() - RESTING_HR_WINDOW_HOURS * MS_PER_HOUR);
  const params = new URLSearchParams({
    filter: `resting_heart_rate.time.physical_time >= "${since.toISOString()}"`,
    pageSize: "50",
  });

  const data = await healthFetch<RestingHeartRateResponse>(
    accessToken,
    `/users/me/dataTypes/resting-heart-rate/dataPoints?${params.toString()}`,
  );

  const candidates = (data.dataPoints ?? [])
    .map((p) => {
      const rhr = p.restingHeartRate;
      const bpm = rhr?.beatsPerMinute ?? rhr?.bpm;
      const time = rhr?.time?.physicalTime ?? rhr?.sampleTime?.physicalTime;
      if (typeof bpm !== "number" || !time) return undefined;
      return { bpm, time };
    })
    .filter((c): c is { bpm: number; time: string } => Boolean(c));

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return candidates[0].bpm;
}

type SleepPoint = {
  sleep?: { interval?: { startTime?: string; endTime?: string } };
  interval?: { startTime?: string; endTime?: string };
};
type SleepResponse = { dataPoints?: SleepPoint[] };

export type SleepSummary = { hours: number; start: string; end: string };

async function fetchRecentSleep(accessToken: string): Promise<SleepSummary | undefined> {
  const since = new Date(Date.now() - SLEEP_WINDOW_HOURS * MS_PER_HOUR);
  const params = new URLSearchParams({
    filter: `sleep.interval.start_time >= "${since.toISOString()}"`,
    pageSize: "20",
  });

  const data = await healthFetch<SleepResponse>(
    accessToken,
    `/users/me/dataTypes/sleep/dataPoints?${params.toString()}`,
  );

  const sessions = (data.dataPoints ?? [])
    .map((p) => {
      const interval = p.sleep?.interval ?? p.interval;
      const start = interval?.startTime;
      const end = interval?.endTime;
      if (!start || !end) return undefined;
      const ms = new Date(end).getTime() - new Date(start).getTime();
      return { start, end, ms };
    })
    .filter((s): s is { start: string; end: string; ms: number } => Boolean(s));

  if (sessions.length === 0) return undefined;

  // The longest session in the window is treated as the main sleep, so a
  // short nap doesn't get reported in place of last night's sleep.
  sessions.sort((a, b) => b.ms - a.ms);
  const longest = sessions[0];
  return {
    hours: Math.round((longest.ms / MS_PER_HOUR) * 10) / 10,
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
