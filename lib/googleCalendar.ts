// Server-side helper for reading the user's Google Calendar(s).
// Single-user app: credentials live in env vars, no database involved.
// Supports up to two Google accounts (e.g. personal + work); both calendars'
// events get merged into one list. See app/api/calendar/auth and
// app/api/calendar/callback for how GOOGLE_REFRESH_TOKEN(_2) get minted.

import type { CalendarEvent } from "@/lib/data";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Vercel functions run in UTC; events are displayed in this zone instead. */
const TIME_ZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Denver";

type GoogleAccount = {
  /** Distinguishes which account an event came from when deduping the merged list. */
  key: string;
  refreshToken: string;
  calendarId: string;
};

function configuredAccounts(): GoogleAccount[] {
  const accounts: GoogleAccount[] = [];
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    accounts.push({
      key: "1",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    });
  }
  if (process.env.GOOGLE_REFRESH_TOKEN_2) {
    accounts.push({
      key: "2",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN_2,
      calendarId: process.env.GOOGLE_CALENDAR_ID_2 || "primary",
    });
  }
  return accounts;
}

type GoogleEventItem = {
  id: string;
  /** Shared across all instances of a recurring event; absent for one-off events. */
  recurringEventId?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
};

type TokenResponse = { access_token: string };

export function googleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      configuredAccounts().length > 0,
  );
}

/** How many Google accounts are currently connected (0, 1, or 2). */
export function connectedAccountCount(): number {
  return configuredAccounts().length;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar is not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Failed to refresh Google access token (${res.status}): ${detail}`,
    );
  }

  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

/** YYYY-MM-DD in a given zone — used to compare calendar dates safely. */
function dateKeyInTZ(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

/** Minutes to add to a UTC instant to get the wall-clock time in `timeZone`. */
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUTC - date.getTime()) / 60_000;
}

/** UTC instant for local midnight on `dateKey` (YYYY-MM-DD) in `timeZone`. */
function startOfDayUTC(dateKey: string, timeZone: string): Date {
  const utcGuess = new Date(`${dateKey}T00:00:00Z`);
  const offsetMinutes = timeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function weekdayLabel(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", { timeZone, weekday: "short" });
}

function toCalendarEvent(item: GoogleEventItem, todayKey: string): CalendarEvent {
  const title = item.summary || "(No title)";
  const location = item.location || undefined;

  if (item.start?.date) {
    // All-day event: the date string isn't tied to any time zone, so
    // weekday is derived in UTC to avoid shifting it by a day.
    const [y, m, d] = item.start.date.split("-").map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    return {
      id: item.id,
      title,
      location,
      day: item.start.date === todayKey ? "Today" : weekdayLabel(utcDate, "UTC"),
    };
  }

  // Prefer the event's own time zone over our env-var default, since it's
  // what Google Calendar itself uses to render the event's local time.
  const zone = item.start?.timeZone || TIME_ZONE;
  const start = new Date(item.start?.dateTime ?? Date.now());
  return {
    id: item.id,
    title,
    location,
    day:
      dateKeyInTZ(start, zone) === todayKey
        ? "Today"
        : weekdayLabel(start, zone),
    time: start.toLocaleTimeString("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

/** How many raw instances to pull per account before deduping recurring series down to maxResults. */
const FETCH_POOL_SIZE = 50;
/** Outer bound so a quiet calendar doesn't reach weeks into the future to fill maxResults. */
const WINDOW_DAYS = 7;
/** Today page only ever shows this many upcoming items, soonest first. */
const MAX_UP_NEXT = 5;

/** Sortable start instant, used to merge multiple accounts' events into one chronological list. */
function eventStartMs(item: GoogleEventItem): number {
  if (item.start?.date) {
    const [y, m, d] = item.start.date.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }
  return new Date(item.start?.dateTime ?? Date.now()).getTime();
}

async function fetchAccountEvents(
  account: GoogleAccount,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEventItem[]> {
  const accessToken = await getAccessToken(account.refreshToken);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(FETCH_POOL_SIZE),
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(account.calendarId)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to fetch calendar events (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { items?: GoogleEventItem[] };

  // Namespace ids by account so recurring-series dedup below can't collide
  // two different calendars' events that happen to share an id.
  return (data.items ?? []).map((item) => ({
    ...item,
    id: `${account.key}:${item.id}`,
    recurringEventId: item.recurringEventId
      ? `${account.key}:${item.recurringEventId}`
      : undefined,
  }));
}

export async function fetchUpcomingEvents(maxResults = MAX_UP_NEXT): Promise<CalendarEvent[]> {
  const accounts = configuredAccounts();
  const now = new Date();

  const todayKey = dateKeyInTZ(now, TIME_ZONE);

  // Cover full calendar days through today+WINDOW_DAYS inclusive, not a
  // rolling 7×24h span from the current instant — otherwise events later
  // in the day on the final day get cut off whenever "now" is in the
  // afternoon, and the same weekday one week out wouldn't be included.
  const [wy, wm, wd] = todayKey.split("-").map(Number);
  const windowEndKey = new Date(Date.UTC(wy, wm - 1, wd + WINDOW_DAYS + 1))
    .toISOString()
    .slice(0, 10);
  const timeMax = startOfDayUTC(windowEndKey, TIME_ZONE);

  const results = await Promise.allSettled(
    accounts.map((account) => fetchAccountEvents(account, now, timeMax)),
  );

  const allItems: GoogleEventItem[] = [];
  const failures: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    } else {
      const reason =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      failures.push(`Account ${accounts[i].key}: ${reason}`);
    }
  });

  // Only fail outright if every account failed — a problem with one
  // shouldn't take down events from the other.
  if (allItems.length === 0 && failures.length > 0) {
    throw new Error(failures.join("; "));
  }
  if (failures.length > 0) {
    console.error("Google Calendar: one or more accounts failed to fetch:", failures.join("; "));
  }

  allItems.sort((a, b) => eventStartMs(a) - eventStartMs(b));

  // singleEvents=true expands each recurring series (birthdays, weekly
  // 1:1s) into one item per upcoming occurrence. Keep only the soonest
  // occurrence of each series so they don't crowd out one-off events.
  const seenSeries = new Set<string>();
  const deduped: GoogleEventItem[] = [];
  for (const item of allItems) {
    const seriesKey = item.recurringEventId ?? item.id;
    if (seenSeries.has(seriesKey)) continue;
    seenSeries.add(seriesKey);
    deduped.push(item);
    if (deduped.length >= maxResults) break;
  }

  return deduped.map((item) => toCalendarEvent(item, todayKey));
}
