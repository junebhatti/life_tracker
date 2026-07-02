// Builds Things 3 URL-scheme links (https://culturedcode.com/things/help/url-scheme/).
// Opening one hands the task to the Things app, which then shows it in its own
// native home-screen widget. One-way: Life Tracker -> Things.

import type { Task } from "../types";

function buildQuery(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    // encodeURIComponent so spaces become %20 (the Things parser treats "+"
    // literally rather than as a space).
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
}

/**
 * A `things:///add` link for a task. A dueDate (YYYY-MM-DD) schedules it via
 * `when` so it appears in Things' Today list on that day; otherwise it drops
 * into the Inbox.
 */
export function thingsAddUrl(task: Task): string {
  const noteParts: string[] = [];
  if (task.projectName) noteParts.push(task.projectName);
  if (task.recurring) noteParts.push("Recurring");

  return `things:///add?${buildQuery({
    title: task.title,
    notes: noteParts.join(" · ") || undefined,
    when: task.dueDate || undefined,
  })}`;
}
