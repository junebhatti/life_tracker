// Project model: a persistent workspace with milestones, a checklist, and an
// activity log. Projects are referenced by tasks via `projectId`.

export type ProjectType = "active" | "retainer" | "area";

export type Milestone = {
  id: string;
  title: string;
  /** Relative weight used to compute weighted % complete. */
  weight: number;
  done: boolean;
};

export type ChecklistRecurrence = "one-shot" | "weekly" | "monthly";

export type ChecklistItem = {
  id: string;
  title: string;
  recurrence: ChecklistRecurrence;
  done: boolean;
};

export type ActivityKind = "work" | "update";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  note: string;
  /** Minutes logged (work entries only). */
  minutes?: number;
  at: string; // ISO timestamp
};

export type Project = {
  id: string;
  name: string;
  /** Client or area this project belongs to, e.g. "Hill Media Group". */
  client?: string;
  color: string;
  type: ProjectType;
  /** Target date as YYYY-MM-DD. */
  target?: string;
  milestones: Milestone[];
  checklist: ChecklistItem[];
  activity: ActivityEntry[];
  createdAt: string;
};

export type NewProjectInput = {
  name: string;
  client?: string;
  color?: string;
  type?: ProjectType;
  target?: string;
};

/** Palette offered in the project color picker. */
export const PROJECT_COLORS = [
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#6b7280",
];

export const RECURRENCE_LABELS: Record<ChecklistRecurrence, string> = {
  "one-shot": "One-shot (default)",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const PROJECT_TYPE_GROUPS: { type: ProjectType; label: string }[] = [
  { type: "active", label: "Active" },
  { type: "retainer", label: "Retainers" },
  { type: "area", label: "Areas" },
];

/** Weighted milestone completion for a project. */
export function projectProgress(project: Project) {
  const total = project.milestones.reduce((s, m) => s + m.weight, 0);
  const done = project.milestones
    .filter((m) => m.done)
    .reduce((s, m) => s + m.weight, 0);
  const doneCount = project.milestones.filter((m) => m.done).length;
  return {
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    doneCount,
    total: project.milestones.length,
  };
}

/** Total hours logged via work activity entries. */
export function projectHours(project: Project): number {
  const minutes = project.activity
    .filter((a) => a.kind === "work")
    .reduce((s, a) => s + (a.minutes ?? 0), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

/** Clean-slate seed: a single example project (from the design reference). */
export function seedProjects(): Project[] {
  const now = new Date().toISOString();
  return [
    {
      id: "fetter-pools",
      name: "Fetter Pools SEO Project",
      client: "Hill Media Group",
      color: "#a16207",
      type: "active",
      target: `${new Date().getFullYear()}-06-30`,
      createdAt: now,
      milestones: [
        { id: "m1", title: "Elementor Site Redesign Approval", weight: 10, done: false },
        { id: "m2", title: "Main site level pages created and approved", weight: 20, done: false },
        { id: "m3", title: "Service Area & Services Pages Complete", weight: 30, done: false },
        { id: "m4", title: "SEO Meta & Alt On All Pages", weight: 10, done: false },
        { id: "m5", title: "Initial project communication & kickoff", weight: 10, done: true },
        { id: "m6", title: "Site Launched", weight: 10, done: false },
      ],
      checklist: [],
      activity: [
        {
          id: "a1",
          kind: "work",
          note: "Set up Elementor and sent a preview to Ross for feedback.",
          minutes: 120,
          at: now,
        },
      ],
    },
  ];
}
