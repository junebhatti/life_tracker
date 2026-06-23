import SectionHeading from "./SectionHeading";
import type { CalendarEvent } from "@/lib/data";

type CalendarListProps = {
  events: CalendarEvent[];
};

/**
 * Upcoming calendar events in a simple agenda list.
 * This will be populated from Google Calendar in a later pass.
 */
export default function CalendarList({ events }: CalendarListProps) {
  return (
    <section>
      <SectionHeading
        title="Up Next"
        action={
          <span className="transition-colors hover:text-foreground">
            View all →
          </span>
        }
      />
      <div className="flex flex-col">
        {events.map((event) => (
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
    </section>
  );
}
