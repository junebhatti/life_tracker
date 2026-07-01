import { NextRequest, NextResponse } from "next/server";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/googleCalendar";
import type { CalendarEventInput } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = (await request.json()) as CalendarEventInput;
  if (!input.title?.trim() || !input.start || !input.end) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const event = await updateCalendarEvent(decodeURIComponent(id), input);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Google Calendar update failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Couldn't update event.", detail }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteCalendarEvent(decodeURIComponent(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Google Calendar delete failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Couldn't delete event.", detail }, { status: 502 });
  }
}
