// Navigation and calendar data.
// Tasks live in lib/tasks.ts, Projects in lib/projects.ts, and Routines in
// lib/routines.ts, each managed by their own store.

export type NavItem = {
  label: string;
  /** Route the item links to. "/" is the Today home page. */
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/" },
  { label: "Tasks", href: "/tasks" },
  { label: "Routines", href: "/routines" },
  { label: "Projects", href: "/projects" },
  { label: "People", href: "/people" },
  { label: "Library", href: "/library" },
  { label: "Budget", href: "/budget" },
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
