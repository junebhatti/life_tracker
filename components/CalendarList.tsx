"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import type { CalendarEvent } from "@/lib/data";

type EventsResponse = {
  events: CalendarEvent[];
  configured: boolean;
  error?: string;
  detail?: string;
};

/** Matches the 7-day window the API queries Google Calendar for. */
const WINDOW_DAYS = 7;

function formatRangeLabel(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Upcoming events from the connected Google Calendar, in an agenda list. */
export default function CalendarList() {
  const [state, setState] = useState<EventsResponse | null>(null);

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
  const rangeLabel = formatRangeLabel(today, windowEnd);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/events")
      .then((res) => res.json())
      .then((data: EventsResponse) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ events: [], configured: true, error: "Couldn't load calendar events." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <SectionHeading
        title={`Up Next · ${rangeLabel}`}
        action={
          <Link href="/calendar" className="transition-colors hover:text-foreground">
            View all →
          </Link>
        }
      />

      {state === null && (
        <div className="flex flex-col gap-2 py-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-hover" />
          ))}
        </div>
      )}

      {state && !state.configured && (
        <p className="px-2 py-3 text-sm text-muted">
          Google Calendar isn&apos;t connected yet.{" "}
          <a
            href="/api/calendar/auth"
            className="text-foreground underline underline-offset-2"
          >
            Connect it
          </a>
          .
        </p>
      )}

      {state && state.configured && state.error && (
        <div className="px-2 py-3">
          <p className="text-sm text-muted">{state.error}</p>
          {state.detail && (
            <p className="mt-1 break-all font-mono text-[11px] text-muted/70">
              {state.detail}
            </p>
          )}
        </div>
      )}

      {state && state.configured && !state.error && state.events.length === 0 && (
        <p className="px-2 py-3 text-sm text-muted">Nothing on the calendar right now.</p>
      )}

      {state && state.events.length > 0 && (
        <div className="flex flex-col">
          {state.events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-4 rounded-md px-2 py-2 hover:bg-hover"
            >
              <div className="w-16 shrink-0 pt-0.5 text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted">
                  {event.day}
                </div>
                {event.time && (
                  <div className="text-xs text-foreground">{event.time}</div>
                )}
              </div>
              <div className="min-w-0 flex-1 border-l border-border pl-4">
                <p className="text-sm leading-tight text-foreground">
                  {event.title}
                </p>
                {event.location && (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
