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

/** Fallback when the client doesn't report its timezone (e.g. direct API testing). */
const DEFAULT_TIME_ZONE = process.env.GOOGLE_HEALTH_TIMEZONE || "America/Denver";

/** Validates an IANA timezone name by attempting to use it; falls back to the default if invalid/absent. */
function resolveTimeZone(timeZone?: string): string {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

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

/** Recursively searches an object's values for the first key matching any candidate field name. */
function findNestedString(value: unknown, candidates: string[]): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of candidates) {
    const v = record[key];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  for (const nested of Object.values(record)) {
    const found = findNestedString(nested, candidates);
    if (found !== undefined) return found;
  }
  return undefined;
}

type RollupResponse = {
  rollupDataPoints?: Array<{ steps?: { countSum?: string } }>;
};

async function fetchStepsToday(accessToken: string, timeZone: string): Promise<number | undefined> {
  const today = civilDateParts(new Date(), timeZone);
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

async function fetchRestingHeartRate(
  accessToken: string,
  timeZone: string,
): Promise<number | undefined> {
  const today = civilDateParts(new Date(), timeZone);
  const start = civilDateString(shiftCivilDate(today, -(RESTING_HR_WINDOW_DAYS - 1)));
  const end = civilDateString(shiftCivilDate(today, 1));

  // Daily-kind data types filter on a plain civil date, not interval.civil_start_time.
  const params = new URLSearchParams({
    filter: `daily_resting_heart_rate.date >= "${start}" AND daily_resting_heart_rate.date < "${end}"`,
    pageSize: "25",
  });

  const data = await healthFetch<ReconcileResponse>(
    accessToken,
    `/users/me/dataTypes/daily-resting-heart-rate/dataPoints:reconcile?${params.toString()}`,
  );

  const points = data.dataPoints ?? [];
  if (points.length === 0) return undefined;

  // The API doesn't guarantee point order, so explicitly pick the most
  // recently dated reading instead of trusting array order (which previously
  // could pin the value to a stale day for most of the window).
  let latest = points[0];
  let latestDate = findNestedString(latest, ["date"]);
  for (const point of points.slice(1)) {
    const date = findNestedString(point, ["date"]);
    if (date && (!latestDate || date > latestDate)) {
      latest = point;
      latestDate = date;
    }
  }

  return findNestedNumber(latest, ["beatsPerMinute", "bpm", "value", "restingHeartRate"]);
}

/** Minutes spent in each sleep stage, when the device/data source reports them. */
export type SleepStages = {
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
};

export type SleepSummary = {
  hours: number;
  start: string;
  end: string;
  minutesAwake?: number;
  minutesToFallAsleep?: number;
  /** 0-100. */
  efficiency?: number;
  stages?: SleepStages;
};

/** Maps a Google Health sleep-stage enum (e.g. "DEEP", "SLEEP_STAGE_REM") to our bucket. */
function stageBucket(type: string): keyof SleepStages | undefined {
  const t = type.toUpperCase();
  if (t.includes("DEEP")) return "deepMinutes";
  if (t.includes("REM")) return "remMinutes";
  if (t.includes("LIGHT")) return "lightMinutes";
  if (t.includes("AWAKE") || t.includes("WAKE")) return "awakeMinutes";
  return undefined;
}

/**
 * Best-effort parse of per-stage minutes out of a sleep data point. The Health API reports
 * stages as `summary.stagesSummary` — an array of `{ type, minutes }` — and/or as a `stages`
 * array of timed segments. We prefer the precomputed summary, then fall back to summing
 * segment durations, so a missing/renamed summary field still yields a breakdown.
 */
function parseSleepStages(sleep: Record<string, unknown>): SleepStages | undefined {
  const stages: SleepStages = {};
  const add = (bucket: keyof SleepStages, minutes: number) => {
    stages[bucket] = (stages[bucket] ?? 0) + minutes;
  };

  // Preferred: precomputed per-stage minutes.
  const summary = sleep.summary as Record<string, unknown> | undefined;
  const summaryList = summary?.stagesSummary ?? summary?.stages ?? summary?.levels;
  if (Array.isArray(summaryList)) {
    for (const entry of summaryList) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const type = typeof e.type === "string" ? e.type : undefined;
      const bucket = type ? stageBucket(type) : undefined;
      const minutes = readQuantity(e.minutes ?? e.minutesSum ?? e.value, ["minutes", "value"]);
      if (bucket && minutes !== undefined) add(bucket, minutes);
    }
  }

  // Fallback: sum durations from the raw stage segments.
  if (Object.keys(stages).length === 0 && Array.isArray(sleep.stages)) {
    for (const seg of sleep.stages) {
      if (!seg || typeof seg !== "object") continue;
      const s = seg as Record<string, unknown>;
      const type = typeof s.type === "string" ? s.type : undefined;
      const bucket = type ? stageBucket(type) : undefined;
      const startMs = typeof s.startTime === "string" ? Date.parse(s.startTime) : NaN;
      const endMs = typeof s.endTime === "string" ? Date.parse(s.endTime) : NaN;
      if (bucket && Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        add(bucket, (endMs - startMs) / 60000);
      }
    }
    for (const key of Object.keys(stages) as Array<keyof SleepStages>) {
      stages[key] = Math.round(stages[key] as number);
    }
  }

  // If the breakdown lacks an explicit awake total, borrow the summary's.
  if (stages.awakeMinutes === undefined && summary) {
    const awake = findNestedNumber(summary, ["minutesAwake"]);
    if (awake !== undefined) stages.awakeMinutes = awake;
  }

  return Object.keys(stages).length > 0 ? stages : undefined;
}

/**
 * Guards against a garbled breakdown (e.g. "Light 13.1h") — when a data source
 * double-counts stages or reports odd units, the asleep stages (deep + REM +
 * light) can wildly exceed the actual time asleep. If they exceed it by more
 * than ~30%, the breakdown is inconsistent with the total, so drop it rather
 * than show impossible numbers; the widget then just shows total hours.
 */
function sanitizeStages(
  stages: SleepStages | undefined,
  totalAsleepMinutes: number | undefined,
): SleepStages | undefined {
  if (!stages || !totalAsleepMinutes || totalAsleepMinutes <= 0) return stages;
  const asleep = (stages.deepMinutes ?? 0) + (stages.remMinutes ?? 0) + (stages.lightMinutes ?? 0);
  if (asleep > totalAsleepMinutes * 1.3) return undefined;
  return stages;
}

async function fetchRecentSleep(
  accessToken: string,
  timeZone: string,
): Promise<SleepSummary | undefined> {
  const today = civilDateParts(new Date(), timeZone);
  const start = civilDateString(shiftCivilDate(today, -(SLEEP_WINDOW_DAYS - 1)));
  const end = civilDateString(shiftCivilDate(today, 1));

  // Session-kind data types only support filtering on civil_end_time, not civil_start_time.
  const params = new URLSearchParams({
    filter: `sleep.interval.civil_end_time >= "${start}" AND sleep.interval.civil_end_time < "${end}"`,
    pageSize: "20",
    dataSourceFamily: "users/me/dataSourceFamilies/google-wearables",
  });

  const data = await healthFetch<ReconcileResponse>(
    accessToken,
    `/users/me/dataTypes/sleep/dataPoints:reconcile?${params.toString()}`,
  );

  type Session = {
    minutes: number;
    start: string;
    end: string;
    sleep: Record<string, unknown>;
  };

  const sessions = (data.dataPoints ?? [])
    .map((p): Session | undefined => {
      const sleep = (p.sleep ?? p) as Record<string, unknown>;
      const interval = sleep.interval as { startTime?: string; endTime?: string } | undefined;
      const summary = sleep.summary as Record<string, unknown> | undefined;
      const minutes = findNestedNumber(summary, ["minutesAsleep", "minutesInSleepPeriod"]);
      if (minutes === undefined || !interval?.startTime || !interval?.endTime) return undefined;
      return { minutes, start: interval.startTime, end: interval.endTime, sleep };
    })
    .filter((s): s is Session => s !== undefined);

  if (sessions.length === 0) return undefined;

  // Group sessions by the civil date they ended on, then take the longest
  // session from the most recent of those dates. Picking the longest session
  // across the whole window (instead of per-day) could pin the snapshot to
  // an older, longer night and make "last night's sleep" stop updating once
  // a shorter night came along.
  const byEndDate = new Map<string, Session[]>();
  for (const session of sessions) {
    const dateKey = civilDateString(civilDateParts(new Date(session.end), timeZone));
    const list = byEndDate.get(dateKey);
    if (list) list.push(session);
    else byEndDate.set(dateKey, [session]);
  }
  const mostRecentDate = [...byEndDate.keys()].sort().at(-1)!;
  const candidates = byEndDate.get(mostRecentDate)!;
  candidates.sort((a, b) => b.minutes - a.minutes);
  const longest = candidates[0];
  const sleep = longest.sleep;
  const summary = sleep.summary as Record<string, unknown> | undefined;

  return {
    hours: Math.round((longest.minutes / 60) * 10) / 10,
    start: longest.start,
    end: longest.end,
    minutesAwake: summary ? findNestedNumber(summary, ["minutesAwake"]) : undefined,
    minutesToFallAsleep: summary ? findNestedNumber(summary, ["minutesToFallAsleep"]) : undefined,
    efficiency: summary ? findNestedNumber(summary, ["efficiency"]) : undefined,
    stages: sanitizeStages(parseSleepStages(sleep), longest.minutes),
  };
}

export type NutritionSummary = {
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
};

/** Pulls a numeric quantity out of a field that may be a flat number or a nested `{ grams/kcal/value: n }` object. */
function readQuantity(node: unknown, nestedCandidates: string[]): number | undefined {
  if (typeof node === "number" && Number.isFinite(node)) return node;
  if (typeof node === "string" && node.trim() !== "" && Number.isFinite(Number(node))) return Number(node);
  return findNestedNumber(node, nestedCandidates);
}

async function fetchNutritionToday(
  accessToken: string,
  timeZone: string,
): Promise<NutritionSummary | undefined> {
  const today = civilDateParts(new Date(), timeZone);
  const tomorrow = shiftCivilDate(today, 1);

  const data = await healthFetch<RollupResponse>(
    accessToken,
    "/users/me/dataTypes/nutrition-log/dataPoints:dailyRollUp",
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

  const point = data.rollupDataPoints?.[0] as Record<string, unknown> | undefined;
  if (!point) return undefined;

  const log = (point.nutritionLog ?? point) as Record<string, unknown>;
  const nutrients = log.nutrients as Record<string, unknown> | undefined;

  const calories = readQuantity(log.energy, ["kcal", "kilocalories", "calories", "sum", "kcalSum"]);
  // carbs/fat both live under a "total<Nutrient>" key (confirmed working) —
  // protein should follow the same convention; the nutrients.protein/log.protein
  // guesses below are kept as fallbacks in case a given account's payload shape
  // differs, but totalProtein is the one that's actually been observed to work.
  const proteinGrams =
    readQuantity(log.totalProtein, ["grams", "value", "amount", "sum", "gramsSum"]) ??
    readQuantity(nutrients?.protein, ["grams", "value", "amount", "sum", "gramsSum"]) ??
    readQuantity(log.protein, ["grams", "value", "amount", "sum", "gramsSum"]);
  const carbsGrams = readQuantity(log.totalCarbohydrate, ["grams", "value", "amount", "sum", "gramsSum"]);
  const fatGrams = readQuantity(log.totalFat, ["grams", "value", "amount", "sum", "gramsSum"]);

  // totalProtein was a guess (carbs/fat's confirmed keys suggested the same
  // "total<Nutrient>" pattern) and it's apparently still wrong. Rather than
  // guess a third time, log the actual keys so the real field name shows up
  // in Vercel's function logs next time this runs.
  if (proteinGrams === undefined) {
    console.error(
      "Nutrition protein still unresolved — actual payload keys:",
      JSON.stringify({ logKeys: Object.keys(log), nutrientsKeys: nutrients ? Object.keys(nutrients) : null }),
    );
  }

  if (
    calories === undefined &&
    proteinGrams === undefined &&
    carbsGrams === undefined &&
    fatGrams === undefined
  ) {
    return undefined;
  }

  return { calories, proteinGrams, carbsGrams, fatGrams };
}

export type HealthSnapshot = {
  steps?: number;
  restingHeartRate?: number;
  sleep?: SleepSummary;
  nutrition?: NutritionSummary;
};

/** Per-metric fetch failures, keyed by field name — surfaced in the Settings test panel. */
type SnapshotDebug = Partial<Record<"steps" | "restingHeartRate" | "sleep" | "nutrition", string>>;

async function fetchHealthSnapshotWithDebug(
  timeZone: string,
): Promise<HealthSnapshot & { debug?: SnapshotDebug }> {
  // Fetched outside the per-metric try/catches below so a bad/expired
  // refresh token surfaces as a real connectivity error instead of silently
  // returning an empty snapshot.
  const accessToken = await getAccessToken();
  const debug: SnapshotDebug = {};

  const [steps, restingHeartRate, sleep, nutrition] = await Promise.all([
    fetchStepsToday(accessToken, timeZone).catch((error) => {
      debug.steps = error instanceof Error ? error.message : String(error);
      return undefined;
    }),
    fetchRestingHeartRate(accessToken, timeZone).catch((error) => {
      debug.restingHeartRate = error instanceof Error ? error.message : String(error);
      return undefined;
    }),
    fetchRecentSleep(accessToken, timeZone).catch((error) => {
      debug.sleep = error instanceof Error ? error.message : String(error);
      return undefined;
    }),
    fetchNutritionToday(accessToken, timeZone).catch((error) => {
      debug.nutrition = error instanceof Error ? error.message : String(error);
      return undefined;
    }),
  ]);

  return {
    steps,
    restingHeartRate,
    sleep,
    nutrition,
    debug: Object.keys(debug).length ? debug : undefined,
  };
}

/**
 * Fetches today's steps, latest resting heart rate, and last sleep session in parallel.
 * `timeZone` should be the viewer's IANA timezone (e.g. from the browser); falls back to
 * GOOGLE_HEALTH_TIMEZONE/America/Denver if omitted or invalid.
 */
export async function fetchHealthSnapshot(timeZone?: string): Promise<HealthSnapshot> {
  const { debug, ...snapshot } = await fetchHealthSnapshotWithDebug(resolveTimeZone(timeZone));
  if (debug) {
    for (const [field, message] of Object.entries(debug)) {
      console.error(`Google Health: ${field} fetch failed:`, message);
    }
  }
  return snapshot;
}

export type HealthStatus = {
  connected: boolean;
  snapshot?: HealthSnapshot;
  error?: string;
  debug?: SnapshotDebug;
};

/** For the Settings page's "test sync" button. */
export async function checkHealthStatus(timeZone?: string): Promise<HealthStatus> {
  try {
    const { debug, ...snapshot } = await fetchHealthSnapshotWithDebug(resolveTimeZone(timeZone));
    return { connected: true, snapshot, debug };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
