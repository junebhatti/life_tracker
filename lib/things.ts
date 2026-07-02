// Builds Things 3 URL-scheme links (https://culturedcode.com/things/help/url-scheme/).
// Tapping one hands the task off to the Things app, which then shows it in its
// own native home-screen widget. One-way: Life Tracker -> Things.

function buildQuery(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    // encodeURIComponent (not URLSearchParams) so spaces become %20, which the
    // Things x-callback parser expects — a "+" would be taken literally.
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
}

/**
 * A `things:///add` link for a single task. A `due` (YYYY-MM-DD) schedules it
 * via `when`, so it lands in Things' Today list on that day; with no due date it
 * drops into the Inbox (matching the Inbox widget).
 */
export function thingsAddUrl(
  task: { title: string; due?: string; recurrence?: string },
  projectName?: string,
): string {
  const noteParts: string[] = [];
  if (projectName) noteParts.push(projectName);
  if (task.recurrence) noteParts.push(`Recurs: ${task.recurrence}`);

  return `things:///add?${buildQuery({
    title: task.title,
    notes: noteParts.join(" · ") || undefined,
    when: task.due || undefined,
  })}`;
}
