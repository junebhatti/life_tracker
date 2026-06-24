import { NextResponse } from "next/server";
import {
  connectedAccountCount,
  fetchUpcomingEvents,
  googleCalendarConfigured,
} from "@/lib/googleCalendar";

export async function GET() {
  if (!googleCalendarConfigured()) {
    return NextResponse.json({ events: [], configured: false, accountsConnected: 0 });
  }

  const accountsConnected = connectedAccountCount();

  try {
    const events = await fetchUpcomingEvents();
    return NextResponse.json({ events, configured: true, accountsConnected });
  } catch (error) {
    console.error("Google Calendar fetch failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        events: [],
        configured: true,
        accountsConnected,
        error: "Couldn't load calendar events.",
        detail,
      },
      { status: 502 },
    );
  }
}
