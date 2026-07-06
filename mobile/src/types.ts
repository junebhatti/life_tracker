import type { PodcastMeta } from "./lib/podcast";
export type { PodcastMeta } from "./lib/podcast";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  starred: boolean;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  dueDate?: string;
  dueLabel?: string;
  overdue?: boolean;
  recurring?: boolean;
  /** Raw recurrence text (e.g. "Weekly"), editable — `recurring` is just its presence as a boolean. */
  recurrence?: string;
};

export type AgendaEvent = {
  id: string;
  title: string;
  day?: string;
  time: string;
  location?: string;
};

export type ProjectGroup = "Active" | "Retainers" | "Areas" | "Practice";

// Shapes mirror the web ProjectStore jsonb: milestones carry a weight, checklist
// items a recurrence. Both use `title` (not `text`) so the two apps read/write
// the same rows.
export type Milestone = { id: string; title: string; weight?: number; done: boolean };
export type ChecklistItem = { id: string; title: string; recurrence?: string; done: boolean };
export type ActivityEntry = {
  id: string;
  kind: "work" | "update";
  note: string;
  minutes?: number;
  at: string;
};

export type ProjectType = "active" | "retainer" | "area" | "practice";

export type Project = {
  id: string;
  name: string;
  color: string;
  /** Raw type from the DB, kept so the detail/edit views can round-trip it. */
  type: ProjectType;
  group: ProjectGroup;
  meta: string;
  client?: string;
  target?: string;
  milestones: Milestone[];
  checklist: ChecklistItem[];
  activity: ActivityEntry[];
};

export type Person = {
  id: string;
  name: string;
  org?: string;
  noteCount: number;
};

export type LibraryCategory = "Notes" | "Quotes" | "Journal" | "Books" | "Inventory" | "Podcasts";

export type LibraryNote = {
  id: string;
  category: LibraryCategory;
  label: string;
  /** Untransformed title (label is uppercased/truncated for list display). */
  rawTitle?: string;
  sub?: string;
  date: string;
  body: string;
  images?: number;
  tags: string[];
  /** Present on podcast episodes: source URL, cover art, show, host. */
  metadata?: PodcastMeta;
};

type ScrapItemBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  rot?: number;
};

export type ScrapImageItem = ScrapItemBase & { type: "img"; label: string; url?: string };
export type ScrapQuoteItem = ScrapItemBase & { type: "quote"; text: string; source: string };
export type ScrapNoteItem = ScrapItemBase & { type: "note"; text: string };
export type ScrapItem = ScrapImageItem | ScrapQuoteItem | ScrapNoteItem;

export type LibraryFilter = "All" | LibraryCategory | "People";

export type CaptureKind = "task" | "quote" | "journal" | "note";

export type Routine = {
  id: string;
  title: string;
  description?: string;
  period: string;
  streakGoal?: number;
  doneToday: boolean;
  streak: number;
};

export type HealthData = {
  sleepHours?: number;
  sleepStart?: string;
  sleepEnd?: string;
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
  // Sleep depth detail
  efficiency?: number;
  minutesToFallAsleep?: number;
  minutesAwake?: number;
  restingHR?: number;
  steps?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

/** One day of history from /api/health/history, for the trend graphs. */
export type HealthHistoryDay = {
  date: string;
  sleepHours: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

/** One day of history from /api/water/history, for the water habit graph. */
export type WaterHistoryDay = {
  date: string;
  totalMl: number;
};

/** One logged glass/amount from today, so a mis-tap can be deleted individually. */
export type WaterEntry = {
  id: string;
  amountMl: number;
  loggedAt: string;
};
