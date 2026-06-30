"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import CalendarEventForm from "@/components/CalendarEventForm";
import type { EditableCalendarEvent } from "@/lib/data";

type AgendaResponse = {
  events: EditableCalendarEvent[];
  configured: boolean;
  accounts: string[];
  error?: string;
  detail?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Civil date the event falls on, in the browser's local time zone. */
function dateKeyOf(event: EditableCalendarEvent): string {
  return event.allDay ? event.start : localDateKey(new Date(event.start));
}

function dayLabel(dateKey: string, todayKey: string, tomorrowKey: string): string {
  if (dateKey === todayKey) return "Today";
  if (dateKey === tomorrowKey) return "Tomorrow";
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(event: EditableCalendarEvent): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Editable agenda backed by Google Calendar — clicking a row, or "+ Add event", opens a form that writes back. */
export default function CalendarPage() {
  const [state, setState] = useState<AgendaResponse | null>(null);
  const [formState, setFormState] = useState<{ event?: EditableCalendarEvent } | null>(null);

  const loadAgenda = useCallback(() => {
    fetch("/api/calendar/agenda")
      .then((res) => res.json())
      .then((data: AgendaResponse) => setState(data))
      .catch(() => {
        setState({ events: [], configured: true, accounts: [], error: "Couldn't load calendar events." });
      });
  }, []);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  const today = new Date();
  const todayKey = localDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  const groups: { dateKey: string; events: EditableCalendarEvent[] }[] = [];
  if (state?.events) {
    const byDate = new Map<string, EditableCalendarEvent[]>();
    for (const event of state.events) {
      const key = dateKeyOf(event);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(event);
    }
    for (const [dateKey, events] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      groups.push({ dateKey, events });
    }
  }

  const notConnected = state && !state.configured;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            ← Today
          </Link>

          <div className="mt-4 flex items-baseline justify-between">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Calendar</h1>
            {state?.configured && !state.error && (
              <button
                type="button"
                onClick={() => setFormState({})}
                className="text-sm text-foreground underline underline-offset-2"
              >
                + Add event
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            Synced with Google Calendar — edits here write back to your calendar.
          </p>

          {notConnected && (
            <p className="mt-10 text-sm text-muted">
              Not connected.{" "}
              <a href="/api/calendar/auth" className="text-foreground underline underline-offset-2">
                Connect Google Calendar
              </a>
              .
            </p>
          )}

          {state && state.configured && state.error && (
            <div className="mt-10">
              <p className="text-sm text-muted">{state.error}</p>
              {state.detail && (
                <p className="mt-1 break-all font-mono text-[11px] text-muted/70">{state.detail}</p>
              )}
              <p className="mt-3 text-sm text-muted">
                If you connected before this calendar became editable, you&apos;ll need to{" "}
                <a href="/api/calendar/auth" className="text-foreground underline underline-offset-2">
                  reconnect
                </a>{" "}
                to grant write access.
              </p>
            </div>
          )}

          {state === null && (
            <div className="mt-10 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-hover" />
              ))}
            </div>
          )}

          {state && state.configured && !state.error && (
            <div className="mt-10 flex flex-col">
              {groups.length === 0 && (
                <p className="text-sm text-muted">Nothing on the calendar right now.</p>
              )}
              {groups.map(({ dateKey, events }) => (
                <section key={dateKey} className="border-t border-border py-4 first:border-0 first:pt-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    {dayLabel(dateKey, todayKey, tomorrowKey)}
                  </p>
                  <div className="mt-2 flex flex-col">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setFormState({ event })}
                        className="flex items-start gap-4 rounded-md px-2 py-2 text-left hover:bg-hover"
                      >
                        <div className="w-20 shrink-0 pt-0.5 text-xs text-muted">{timeLabel(event)}</div>
                        <div className="min-w-0 flex-1 border-l border-border pl-4">
                          <p className="text-sm leading-tight text-foreground">{event.title}</p>
                          {event.location && (
                            <p className="mt-0.5 truncate text-xs text-muted">{event.location}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {formState && (
        <CalendarEventForm
          onClose={() => setFormState(null)}
          onSaved={loadAgenda}
          accounts={state?.accounts ?? []}
          event={formState.event}
        />
      )}
    </div>
  );
}
