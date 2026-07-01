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

type ViewMode = "month" | "week";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}
function startOfWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return addDaysKey(dateKey, -new Date(y, m - 1, d).getDay());
}
function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function fmtShortTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${ap}` : `${h12}:${pad(m)}${ap}`;
}

// Stable warm-palette colors for event cards (cream-theme friendly).
const EVENT_PALETTES = [
  { bg: "#fdf2ea", accent: "#c07040", text: "#7a4020" },
  { bg: "#eef5ee", accent: "#4d7c5b", text: "#2a5c3a" },
  { bg: "#edf2f8", accent: "#3d5c80", text: "#1e3a5c" },
  { bg: "#f5edf5", accent: "#784878", text: "#4a1e4a" },
  { bg: "#f5f7ea", accent: "#5a6e2a", text: "#38480e" },
];
function paletteFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return EVENT_PALETTES[h % EVENT_PALETTES.length];
}

function dateKeyOf(event: EditableCalendarEvent): string {
  return event.allDay ? event.start : localDateKey(new Date(event.start));
}

// ─── Month helpers ───────────────────────────────────────────────────────────

function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}
function parseMonthKey(mk: string): [number, number] {
  const [y, m] = mk.split("-").map(Number);
  return [y, m];
}
function monthLabel(mk: string): string {
  const [y, m] = parseMonthKey(mk);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function monthGrid(mk: string): string[] {
  const [y, m] = parseMonthKey(mk);
  const firstDay = new Date(y, m - 1, 1);
  const gridStart = new Date(y, m - 1, 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return localDateKey(d);
  });
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function weekRangeLabel(weekStart: string): string {
  const [sy, sm, sd] = weekStart.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(sy, sm - 1, sd + 6);
  const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  return start.getMonth() === end.getMonth()
    ? `${fmtMonth(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    : `${fmtMonth(start)} ${start.getDate()} – ${fmtMonth(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

function hourLabel(hour: number): string {
  if (hour === 0) return "";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export default function CalendarPage() {
  const todayKey = localDateKey(new Date());
  const todayDate = new Date();

  const [state, setState] = useState<AgendaResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(() =>
    monthKey(todayDate.getFullYear(), todayDate.getMonth() + 1),
  );
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(todayKey));
  const [formState, setFormState] = useState<{
    event?: EditableCalendarEvent;
    defaultDate?: string;
  } | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<EditableCalendarEvent | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const loadAgenda = useCallback(() => {
    fetch("/api/calendar/agenda")
      .then((r) => r.json())
      .then((data: AgendaResponse) => setState(data))
      .catch(() => setState({ events: [], configured: true, accounts: [], error: "Couldn't load calendar events." }));
  }, []);

  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  useEffect(() => {
    if (viewMode !== "week" || scrolledRef.current || !gridRef.current) return;
    gridRef.current.scrollTop = 7 * HOUR_HEIGHT;
    scrolledRef.current = true;
  }, [state, viewMode]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const grid = useMemo(() => monthGrid(currentMonth), [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { allDay: EditableCalendarEvent[]; timed: EditableCalendarEvent[] }>();
    // Pre-populate visible date keys for both views.
    const keys = viewMode === "month"
      ? grid
      : Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
    for (const k of keys) map.set(k, { allDay: [], timed: [] });

    for (const ev of state?.events ?? []) {
      const key = dateKeyOf(ev);
      if (!map.has(key)) map.set(key, { allDay: [], timed: [] });
      const bucket = map.get(key)!;
      if (ev.allDay) bucket.allDay.push(ev);
      else bucket.timed.push(ev);
    }
    return map;
  }, [state, grid, weekStart, viewMode]);

  // ── Drag-to-move ─────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    async (targetDateKey: string) => {
      const ev = draggingEvent;
      setDraggingEvent(null);
      setDropTarget(null);
      if (!ev || dateKeyOf(ev) === targetDateKey) return;

      let newStart: string, newEnd: string;
      if (ev.allDay) {
        newStart = targetDateKey;
        newEnd = addDaysKey(targetDateKey, 1);
      } else {
        const orig = new Date(ev.start);
        const duration = new Date(ev.end).getTime() - orig.getTime();
        const [ty, tm, td] = targetDateKey.split("-").map(Number);
        const next = new Date(ty, tm - 1, td, orig.getHours(), orig.getMinutes());
        newStart = next.toISOString();
        newEnd = new Date(next.getTime() + duration).toISOString();
      }

      await fetch(`/api/calendar/events/${encodeURIComponent(ev.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ev.title,
          location: ev.location || undefined,
          allDay: ev.allDay,
          start: newStart,
          end: newEnd,
          accountKey: ev.accountKey,
        }),
      });
      loadAgenda();
    },
    [draggingEvent, loadAgenda],
  );

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goTodayMonth = () =>
    setCurrentMonth(monthKey(todayDate.getFullYear(), todayDate.getMonth() + 1));

  const stepMonth = (delta: number) => {
    const [y, m] = parseMonthKey(currentMonth);
    const d = new Date(y, m - 1 + delta, 1);
    setCurrentMonth(monthKey(d.getFullYear(), d.getMonth() + 1));
  };

  const notConnected = state && !state.configured;
  const [curYear, curMonth] = parseMonthKey(currentMonth);

  // ── Event card (shared between views) ────────────────────────────────────

  function EventPill({
    event,
    compact = false,
    showTime = false,
  }: {
    event: EditableCalendarEvent;
    compact?: boolean;
    showTime?: boolean;
  }) {
    const pal = paletteFor(event.title);
    const isDragging = draggingEvent?.id === event.id;
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggingEvent(event);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDraggingEvent(null);
          setDropTarget(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setFormState({ event });
        }}
        style={{
          backgroundColor: pal.bg,
          borderLeftColor: pal.accent,
          opacity: isDragging ? 0.4 : 1,
        }}
        className={`cursor-pointer select-none rounded-r-md border-l-[3px] px-1.5 transition-opacity hover:brightness-95 ${
          compact ? "py-0.5 text-[10px] leading-tight" : "py-1 text-xs"
        }`}
      >
        <span style={{ color: pal.text }} className="block truncate font-medium">
          {!event.allDay && showTime && (
            <span className="mr-1 font-normal opacity-70">{fmtShortTime(event.start)}</span>
          )}
          {event.title}
        </span>
      </div>
    );
  }

  // ── Month view ────────────────────────────────────────────────────────────

  function MonthView() {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Day-name header */}
        <div className="grid grid-cols-7 border-b border-border bg-sidebar">
          {DAY_NAMES.map((n) => (
            <div key={n} className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted">
              {n}
            </div>
          ))}
        </div>

        {/* 6-week grid */}
        <div className="grid grid-cols-7">
          {grid.map((key, idx) => {
            const [, m, d] = key.split("-").map(Number);
            const inMonth = m === curMonth;
            const isToday = key === todayKey;
            const bucket = eventsByDay.get(key);
            const allEvents = [
              ...(bucket?.allDay ?? []),
              ...(bucket?.timed ?? []).sort(
                (a, b) => minutesOfDay(a.start) - minutesOfDay(b.start),
              ),
            ];
            const MAX_VISIBLE = 3;
            const visible = allEvents.slice(0, MAX_VISIBLE);
            const overflow = allEvents.length - MAX_VISIBLE;
            const isDropTarget = dropTarget === key;
            const colIdx = idx % 7;

            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(key);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(key);
                }}
                onClick={() => setFormState({ defaultDate: key })}
                style={{ cursor: draggingEvent ? "copy" : "pointer" }}
                className={[
                  "relative min-h-[100px] border-b border-r border-border p-1.5 transition-colors",
                  colIdx === 6 ? "border-r-0" : "",
                  idx >= 35 ? "border-b-0" : "",
                  isDropTarget ? "bg-hover" : inMonth ? "bg-background hover:bg-hover/50" : "bg-sidebar/60",
                ].join(" ")}
              >
                {/* Day number */}
                <div className="mb-1 flex justify-end">
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      isToday
                        ? "bg-neutral-800 font-semibold text-white"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted",
                    ].join(" ")}
                  >
                    {d}
                  </span>
                </div>

                {/* Event pills */}
                <div className="flex flex-col gap-0.5">
                  {visible.map((ev) => (
                    <EventPill key={ev.id} event={ev} compact showTime={!ev.allDay} />
                  ))}
                  {overflow > 0 && (
                    <span className="pl-1.5 text-[10px] text-muted">+{overflow} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Week view ─────────────────────────────────────────────────────────────

  function WeekView() {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
    return (
      <div className="overflow-hidden rounded-xl border border-border">
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

        {/* All-day row */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div className="py-1.5 text-right text-[10px] text-muted pr-2">All day</div>
          {weekDays.map((key) => (
            <div key={key} className="flex flex-col gap-0.5 border-l border-border p-1">
              {eventsByDay.get(key)?.allDay.map((ev) => (
                <EventPill key={ev.id} event={ev} compact />
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
                  <div
                    key={hour}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-t border-border/60"
                    onClick={() =>
                      setFormState({
                        defaultDate: key,
                      })
                    }
                  />
                ))}
                {eventsByDay.get(key)?.timed.map((ev) => {
                  const startMin = minutesOfDay(ev.start);
                  const crossesMidnight = new Date(ev.end) > new Date(`${key}T23:59:59`);
                  const endMin = Math.max(startMin + 20, crossesMidnight ? 24 * 60 : minutesOfDay(ev.end));
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                  const pal = paletteFor(ev.title);
                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={() => setDraggingEvent(ev)}
                      onDragEnd={() => { setDraggingEvent(null); setDropTarget(null); }}
                      onClick={(e) => { e.stopPropagation(); setFormState({ event: ev }); }}
                      style={{ top, height, backgroundColor: pal.bg, borderLeftColor: pal.accent }}
                      className="absolute inset-x-0.5 cursor-pointer overflow-hidden rounded-r-md border-l-[3px] px-1.5 py-0.5 hover:brightness-95"
                    >
                      <span style={{ color: pal.text }} className="block truncate text-[11px] font-medium leading-tight">
                        {fmtShortTime(ev.start)} {ev.title}
                      </span>
                      {ev.location && (
                        <span style={{ color: pal.text }} className="block truncate text-[10px] leading-tight opacity-70">
                          {ev.location}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Page layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            ← Today
          </Link>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Calendar</h1>
              <p className="mt-1 text-sm text-muted">
                {viewMode === "month" ? monthLabel(currentMonth) : weekRangeLabel(weekStart)}
              </p>
            </div>

            {state?.configured && !state.error && (
              <div className="flex flex-wrap items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-md border border-border p-0.5">
                  {(["month", "week"] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setViewMode(v)}
                      className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        viewMode === v
                          ? "bg-neutral-800 text-white"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === "month") goTodayMonth();
                    else setWeekStart(startOfWeekKey(todayKey));
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === "month") stepMonth(-1);
                    else setWeekStart(addDaysKey(weekStart, -7));
                  }}
                  aria-label="Previous"
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-hover"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === "month") stepMonth(1);
                    else setWeekStart(addDaysKey(weekStart, 7));
                  }}
                  aria-label="Next"
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-hover"
                >
                  →
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormState({
                      defaultDate:
                        viewMode === "month"
                          ? grid.includes(todayKey)
                            ? todayKey
                            : `${curYear}-${pad(curMonth)}-01`
                          : todayKey,
                    })
                  }
                  className="ml-1 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
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

          {state?.configured && state.error && (
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
            <div className="mt-10 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-hover" />
              ))}
            </div>
          )}

          {state?.configured && !state.error && (
            <div className="mt-6">
              {viewMode === "month" ? <MonthView /> : <WeekView />}
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
