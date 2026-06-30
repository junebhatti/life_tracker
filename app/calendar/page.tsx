"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

/** Sunday of the week containing `dateKey`. */
function startOfWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return addDaysKey(dateKey, -new Date(y, m - 1, d).getDay());
}

function weekRangeLabel(weekStart: string): string {
  const [sy, sm, sd] = weekStart.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const [ey, em, ed] = addDaysKey(weekStart, 6).split("-").map(Number);
  const end = new Date(ey, em - 1, ed);
  const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${fmtMonth(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    : `${fmtMonth(start)} ${start.getDate()} – ${fmtMonth(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function hourLabel(hour: number): string {
  if (hour === 0) return "";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

/** Editable week-view agenda backed by Google Calendar — clicking a day, or an event, opens a form that writes back. */
export default function CalendarPage() {
  const [state, setState] = useState<AgendaResponse | null>(null);
  const [formState, setFormState] = useState<{ event?: EditableCalendarEvent; defaultDate?: string } | null>(
    null,
  );
  const todayKey = localDateKey(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(todayKey));
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

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

  // Auto-scroll the hour grid to the start of the working day, once.
  useEffect(() => {
    if (scrolledRef.current || !gridRef.current) return;
    gridRef.current.scrollTop = 7 * HOUR_HEIGHT;
    scrolledRef.current = true;
  }, [state]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { allDay: EditableCalendarEvent[]; timed: EditableCalendarEvent[] }>();
    for (const key of weekDays) map.set(key, { allDay: [], timed: [] });
    for (const event of state?.events ?? []) {
      const bucket = map.get(dateKeyOf(event));
      if (!bucket) continue;
      if (event.allDay) bucket.allDay.push(event);
      else bucket.timed.push(event);
    }
    return map;
  }, [state, weekDays]);

  const notConnected = state && !state.configured;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            ← Today
          </Link>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Calendar</h1>
              <p className="mt-1 text-sm text-muted">{weekRangeLabel(weekStart)}</p>
            </div>
            {state?.configured && !state.error && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekStart(startOfWeekKey(todayKey))}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(addDaysKey(weekStart, -7))}
                  aria-label="Previous week"
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-hover"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(addDaysKey(weekStart, 7))}
                  aria-label="Next week"
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-hover"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ defaultDate: weekDays.includes(todayKey) ? todayKey : weekStart })
                  }
                  className="ml-2 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
                >
                  + Add event
                </button>
              </div>
            )}
          </div>

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
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              {/* Day headers */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
                <div />
                {weekDays.map((key, i) => {
                  const isToday = key === todayKey;
                  const [, , d] = key.split("-").map(Number);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormState({ defaultDate: key })}
                      className="flex flex-col items-center gap-1 border-l border-border py-2 transition-colors hover:bg-hover"
                    >
                      <span className="text-[10px] uppercase tracking-wider text-muted">{DAY_NAMES[i]}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                          isToday ? "bg-neutral-800 font-medium text-white" : "text-foreground"
                        }`}
                      >
                        {d}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* All-day events */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
                <div className="py-1.5 text-right text-[10px] text-muted">All day</div>
                {weekDays.map((key) => (
                  <div key={key} className="flex flex-col gap-1 border-l border-border p-1">
                    {eventsByDay.get(key)?.allDay.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setFormState({ event })}
                        className="truncate rounded bg-hover px-1.5 py-0.5 text-left text-[11px] text-foreground hover:bg-neutral-200"
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Hour grid */}
              <div ref={gridRef} className="relative max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                  <div>
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: HOUR_HEIGHT }}
                        className="-translate-y-2 pr-2 text-right text-[10px] text-muted"
                      >
                        {hourLabel(hour)}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((key) => (
                    <div key={key} className="relative border-l border-border">
                      {HOURS.map((hour) => (
                        <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-t border-border/60" />
                      ))}
                      {eventsByDay.get(key)?.timed.map((event) => {
                        const startMin = minutesOfDay(event.start);
                        const crossesMidnight = new Date(event.end) > new Date(`${key}T23:59:59`);
                        const endMin = Math.max(startMin + 20, crossesMidnight ? 24 * 60 : minutesOfDay(event.end));
                        const top = (startMin / 60) * HOUR_HEIGHT;
                        const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setFormState({ event })}
                            style={{ top, height }}
                            className="absolute inset-x-0.5 overflow-hidden rounded-md bg-neutral-800 px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm hover:bg-neutral-700"
                          >
                            <span className="block truncate font-medium">{event.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
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
          defaultDate={formState.defaultDate}
        />
      )}
    </div>
  );
}
