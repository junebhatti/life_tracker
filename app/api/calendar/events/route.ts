import { NextResponse } from "next/server";
import { fetchUpcomingEvents, googleCalendarConfigured } from "@/lib/googleCalendar";

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
