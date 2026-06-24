// Server-side helper for reading the user's Google Calendar.
// Single-user app: credentials live in env vars, no database involved.
// See app/api/calendar/auth and app/api/calendar/callback for how
// GOOGLE_REFRESH_TOKEN gets minted.

import type { CalendarEvent } from "@/lib/data";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
/** Vercel functions run in UTC; events are displayed in this zone instead. */
const TIME_ZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Denver";

type GoogleEventItem = {
  id: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
};

type TokenResponse = { access_token: string };

export function googleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
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

  const start = new Date(item.start?.dateTime ?? Date.now());
  return {
    id: item.id,
    title,
    location,
    day:
      dateKeyInTZ(start, TIME_ZONE) === todayKey
        ? "Today"
        : weekdayLabel(start, TIME_ZONE),
    time: start.toLocaleTimeString("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export async function fetchUpcomingEvents(maxResults = 10): Promise<CalendarEvent[]> {
  const accessToken = await getAccessToken();
  const now = new Date();

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to fetch calendar events (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { items?: GoogleEventItem[] };
  const todayKey = dateKeyInTZ(now, TIME_ZONE);
  return (data.items ?? []).map((item) => toCalendarEvent(item, todayKey));
}
