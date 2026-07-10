"use client";

import { useEffect, useState } from "react";
import type { CalendarEventInput, EditableCalendarEvent } from "@/lib/data";

type CalendarEventFormProps = {
  onClose: () => void;
  /** Refetches the agenda after a successful save/delete. */
  onSaved: () => void;
  accounts: string[];
  /** When provided, the form edits this event instead of creating a new one. */
  event?: EditableCalendarEvent;
  /** Date (YYYY-MM-DD) to default a new event onto, e.g. the day the user clicked. */
  defaultDate?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DDTHH:mm for a <input type="datetime-local">, derived from the browser's local time. */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTimedValue(dateKey: string, hour: number): string {
  return `${dateKey}T${pad(hour)}:00`;
}

/** Google's all-day "end" is exclusive — the day after the last day shown. */
function addOneDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Modal form for creating, editing, or deleting an event — writes back to Google Calendar. */
export default function CalendarEventForm({
  onClose,
  onSaved,
  accounts,
  event,
  defaultDate,
}: CalendarEventFormProps) {
  const editing = !!event;
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(event?.title ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [date, setDate] = useState(event?.allDay ? event.start : today);
  const [startLocal, setStartLocal] = useState(
    event && !event.allDay ? toDatetimeLocalValue(event.start) : defaultTimedValue(today, 9),
  );
  const [endLocal, setEndLocal] = useState(
    event && !event.allDay ? toDatetimeLocalValue(event.end) : defaultTimedValue(today, 10),
  );
  const [accountKey, setAccountKey] = useState(event?.accountKey ?? accounts[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving || deleting) return;
    setSaving(true);
    setError(null);

    const input: CalendarEventInput = {
      title: title.trim(),
      location: location.trim() || undefined,
      allDay,
      start: allDay ? date : new Date(startLocal).toISOString(),
      end: allDay ? addOneDay(date) : new Date(endLocal).toISOString(),
      accountKey,
    };

    try {
      const res = await fetch(
        editing ? `/api/calendar/events/${encodeURIComponent(event.id)}` : "/api/calendar/events",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save event.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save event.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || saving || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete event.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete event.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {editing ? "Edit event" : "New event"}
        </h2>

        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 accent-neutral-800"
          />
          All day
        </label>

        {allDay ? (
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            />
          </label>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Starts</span>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Ends</span>
              <input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
              />
            </label>
          </div>
        )}

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Location (optional)
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
          />
        </label>

        {!editing && accounts.length > 1 && (
          <label className="mt-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Calendar</span>
            <div className="flex rounded-md border border-border p-0.5">
              {accounts.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccountKey(key)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    accountKey === key
                      ? "bg-[#2323e8] text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Account {key}
                </button>
              ))}
            </div>
          </label>
        )}

        {error && <p className="mt-4 text-sm text-muted">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-2">
          {editing ? (
            <button
              type="button"
              onClick={remove}
              disabled={saving || deleting}
              className="rounded-md px-3 py-2 text-sm text-accent transition-colors hover:bg-hover disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving || deleting}
              className="rounded-md bg-[#2323e8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1c1cba] disabled:opacity-40"
            >
              {saving ? "Saving…" : editing ? "Save" : "Add event"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
