export type Task = {
  id: string;
  title: string;
  done: boolean;
  starred: boolean;
  projectName?: string;
  projectColor?: string;
  dueDate?: string;
  dueLabel?: string;
  overdue?: boolean;
  recurring?: boolean;
};

export type AgendaEvent = {
  id: string;
  title: string;
  day?: string;
  time: string;
  location?: string;
};

export type ProjectGroup = "Active" | "Retainers" | "Areas";

// Shapes mirror the web ProjectStore jsonb: milestones carry a weight, checklist
// items a recurrence. Both use `title` (not `text`) so the two apps read/write
// the same rows.
export type Milestone = { id: string; title: string; weight?: number; done: boolean };
export type ChecklistItem = { id: string; title: string; recurrence?: string; done: boolean };

export type Project = {
  id: string;
  name: string;
  color: string;
  group: ProjectGroup;
  meta: string;
  client?: string;
  target?: string;
  milestones: Milestone[];
  checklist: ChecklistItem[];
};

export type Person = {
  id: string;
  name: string;
  org?: string;
  noteCount: number;
};

export type LibraryCategory = "Notes" | "Quotes" | "Journal" | "Books" | "Inventory";

export type LibraryNote = {
  id: string;
  category: LibraryCategory;
  label: string;
  sub?: string;
  date: string;
  body: string;
  images?: number;
  tags: string[];
};

type ScrapItemBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  rot?: number;
};

export type ScrapImageItem = ScrapItemBase & { type: "img"; label: string };
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
  restingHR?: number;
  steps?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};
