import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, fetchUpcomingEvents, googleCalendarConfigured } from "@/lib/googleCalendar";
import type { CalendarEventInput } from "@/lib/data";

export async function GET() {
  if (!googleCalendarConfigured()) {
    return NextResponse.json({ events: [], configured: false });
  }

  try {
    const events = await fetchUpcomingEvents();
    return NextResponse.json({ events, configured: true });
  } catch (error) {
    console.error("Google Calendar fetch failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        events: [],
        configured: true,
        error: "Couldn't load calendar events.",
        detail,
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!googleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar isn't connected." }, { status: 400 });
  }

  const input = (await request.json()) as CalendarEventInput;
  if (!input.title?.trim() || !input.start || !input.end || !input.accountKey) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const event = await createCalendarEvent(input);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Google Calendar create failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Couldn't create event.", detail }, { status: 502 });
  }
}
