// Navigation and calendar data.
// Tasks live in lib/tasks.ts, Projects in lib/projects.ts, and Routines in
// lib/routines.ts, each managed by their own store.

export type NavItem = {
  label: string;
  /** Route the item links to. "/" is the Today home page. */
  href: string;
  /** When true, use a plain full-page navigation instead of Next's client
   *  router — needed for paths that are server rewrites to an external site
   *  (e.g. /taste), so each visit fetches the latest deploy fresh. */
  external?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/" },
  { label: "Tasks", href: "/tasks" },
  { label: "Routines", href: "/routines" },
  { label: "Projects", href: "/projects" },
  { label: "Library", href: "/library" },
  { label: "Taste of June", href: "/taste", external: true },
  { label: "Budget", href: "/budget" },
  { label: "Calendar", href: "/calendar" },
  { label: "Scrapbook", href: "/scrapbook" },
  { label: "Map", href: "/map" },
];

/** Shape returned by /api/calendar/events, sourced from Google Calendar. */
export type CalendarEvent = {
  id: string;
  title: string;
  /** Short day label, e.g. "Today", "Fri", "Sun". */
  day: string;
  /** Time label, e.g. "2:30 PM". Omit for all-day events. */
  time?: string;
  location?: string;
};

/** Shape used by the editable /calendar page — carries raw start/end so edits round-trip to Google. */
export type EditableCalendarEvent = {
  id: string;
  title: string;
  location?: string;
  allDay: boolean;
  /** ISO datetime for timed events, YYYY-MM-DD for all-day events. */
  start: string;
  end: string;
  /** Which connected Google account (key "1" or "2") the event lives on. */
  accountKey: string;
};

/** Body for creating/updating a calendar event via the API. */
export type CalendarEventInput = {
  title: string;
  location?: string;
  allDay: boolean;
  start: string;
  end: string;
  accountKey: string;
};
