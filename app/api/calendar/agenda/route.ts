import { NextResponse } from "next/server";
import { accountKeys, fetchAgendaEvents, googleCalendarConfigured } from "@/lib/googleCalendar";

/** Powers the editable /calendar page — a wider window than the Today page's Up Next widget. */
export async function GET() {
  if (!googleCalendarConfigured()) {
    return NextResponse.json({ events: [], configured: false, accounts: [] });
  }

  try {
    const events = await fetchAgendaEvents();
    return NextResponse.json({ events, configured: true, accounts: accountKeys() });
  } catch (error) {
    console.error("Google Calendar agenda fetch failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        events: [],
        configured: true,
        accounts: accountKeys(),
        error: "Couldn't load calendar events.",
        detail,
      },
      { status: 502 },
    );
  }
}
