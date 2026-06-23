// Navigation, calendar, and habit data.
// Tasks now live in lib/tasks.ts and are managed by the task store.

export type NavItem = {
  label: string;
  /** Route the item links to. "/" is the Today home page. */
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/" },
  { label: "Tasks", href: "/tasks" },
  { label: "Projects", href: "/projects" },
  { label: "People", href: "/people" },
  { label: "Library", href: "/library" },
];

export type CalendarEvent = {
  id: string;
  title: string;
  /** Short day label, e.g. "Today", "Fri", "Sun". */
  day: string;
  /** Time label, e.g. "2:30 PM". Omit for all-day events. */
  time?: string;
  location?: string;
};

/** Upcoming calendar events — will be sourced from Google Calendar. */
export const UPCOMING_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    title: "Jerad and Sam Josephson",
    day: "Today",
    time: "2:30 PM",
  },
  {
    id: "e2",
    title: "Mal Dinner",
    day: "Fri",
    time: "7:00 PM",
    location: "Montana Prime Steakhouse",
  },
  {
    id: "e3",
    title: "Church",
    day: "Sun",
    time: "11:00 AM",
    location: "Easthaven Baptist Church, Kalispell, MT",
  },
  {
    id: "e4",
    title: "Table Group",
    day: "Mon",
    time: "6:00 PM",
    location: "Black Rifle Coffee Company, Kalispell, MT",
  },
];

export type Habit = {
  id: string;
  title: string;
  /** Part of the day this routine belongs to. */
  period: "Morning" | "Afternoon" | "Evening";
  /** Current daily streak. */
  streak: number;
  done: boolean;
};

/** Daily routine / habit tracker items. */
export const HABITS: Habit[] = [
  { id: "h1", title: "Pray", period: "Morning", streak: 5, done: true },
  { id: "h2", title: "Start Journal Entry", period: "Morning", streak: 4, done: false },
  { id: "h3", title: "Check Email", period: "Morning", streak: 5, done: true },
  { id: "h4", title: "Listen to God's Word", period: "Morning", streak: 5, done: true },
  { id: "h5", title: "Vitamins", period: "Afternoon", streak: 5, done: true },
  { id: "h6", title: "Check Email", period: "Afternoon", streak: 5, done: true },
  { id: "h7", title: "Close Out Daily Journal Page", period: "Evening", streak: 4, done: false },
  { id: "h8", title: "Write Daily Bible Chapter", period: "Evening", streak: 4, done: false },
];

export const HABIT_PERIODS: Habit["period"][] = ["Morning", "Afternoon", "Evening"];
