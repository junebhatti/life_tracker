// Task model + date helpers shared across the app.

export type TaskStatus = "open" | "done";

export type Task = {
  id: string;
  title: string;
  /** References a Project id (see lib/projects.ts). Undefined = "No project". */
  projectId?: string;
  /** Due date as YYYY-MM-DD. Undefined = no date. */
  due?: string;
  /** Optional recurrence label, e.g. "Weekly", "Monthly". */
  recurrence?: string;
  /** Starred tasks surface in "Top 3 for Today". */
  starred: boolean;
  /** open = live, done = completed/archived. */
  status: TaskStatus;
  createdAt: string;
  /** ISO timestamp set when the task is marked done. */
  completedAt?: string;
};

export type NewTaskInput = {
  title: string;
  projectId?: string;
  due?: string;
  recurrence?: string;
  status?: TaskStatus;
  starred?: boolean;
};

/** Local YYYY-MM-DD for a date (avoids UTC off-by-one from toISOString). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between a due key and today (negative = overdue). */
export function daysUntil(dueKey: string, today = new Date()): number {
  const [y, m, d] = dueKey.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - start.getTime()) / 86_400_000);
}

export function isOverdue(task: Task, today = new Date()): boolean {
  return task.status === "open" && !!task.due && daysUntil(task.due, today) < 0;
}

/** Human label for a due date, e.g. "Due today", "Overdue 3d", "Due Mon". */
export function dueLabel(dueKey: string, today = new Date()): string {
  const diff = daysUntil(dueKey, today);
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  const [y, m, d] = dueKey.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  if (diff < 7) {
    return `Due ${due.toLocaleDateString("en-US", { weekday: "short" })}`;
  }
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export type DueGroup = "Overdue" | "Today" | "Tomorrow" | "Upcoming" | "No date";

export const DUE_GROUP_ORDER: DueGroup[] = [
  "Overdue",
  "Today",
  "Tomorrow",
  "Upcoming",
  "No date",
];

export function dueGroup(task: Task, today = new Date()): DueGroup {
  if (!task.due) return "No date";
  const diff = daysUntil(task.due, today);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return "Upcoming";
}

/** Seed tasks, with due dates anchored relative to first load so the demo
 *  always looks reasonable. Replaced as soon as the user edits anything. */
export function seedTasks(): Task[] {
  const now = new Date();
  const key = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return toDateKey(d);
  };
  const stamp = now.toISOString();

  return [
    { id: "t1", title: "Finish editing", due: key(0), starred: true, status: "open", createdAt: stamp },
    { id: "t2", title: "Missoula Google Ads", projectId: "fetter-pools", due: key(0), starred: true, status: "open", createdAt: stamp },
    { id: "t3", title: "Check oil Ford Ranger", due: key(-3), recurrence: "Monthly", starred: false, status: "open", createdAt: stamp },
    { id: "t4", title: "Setup Review Request System", projectId: "fetter-pools", due: key(0), starred: false, status: "open", createdAt: stamp },
    { id: "t5", title: "Audit Ads Performance", projectId: "fetter-pools", due: key(0), recurrence: "Weekly", starred: false, status: "open", createdAt: stamp },
    { id: "t6", title: "Next Door Post", due: key(0), recurrence: "Weekly", starred: false, status: "open", createdAt: stamp },
    { id: "t7", title: "Schedule social posts", due: key(1), recurrence: "Weekly", starred: false, status: "open", createdAt: stamp },
    { id: "t8", title: "WordPress Plugin Review Topics", due: key(2), starred: false, status: "open", createdAt: stamp },
    { id: "t9", title: "Draft monthly newsletter", due: key(4), starred: false, status: "open", createdAt: stamp },
    { id: "t10", title: "Call insurance about claim", starred: false, status: "open", createdAt: stamp },
    { id: "t11", title: "Old onboarding doc cleanup", due: key(-10), starred: false, status: "done", createdAt: stamp, completedAt: stamp },
  ];
}
