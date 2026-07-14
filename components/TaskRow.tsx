"use client";

import Checkbox from "./Checkbox";
import { useProjects } from "./ProjectStore";
import { dueLabel, isOverdue, type Task } from "@/lib/tasks";
import { thingsAddUrl } from "@/lib/things";

type TaskRowProps = {
  task: Task;
  onToggleComplete: (id: string) => void;
  /** When provided, a clickable star is shown (toggles "Top 3 for Today"). */
  onToggleStar?: (id: string) => void;
  /** When provided, an "Edit" button is shown that hands back the task. */
  onEdit?: (task: Task) => void;
  /** Checked but within the grace period before committing to done. */
  pending?: boolean;
};

/** A single task line: checkbox, title, project/due/recurrence tags, star. */
export default function TaskRow({
  task,
  onToggleComplete,
  onToggleStar,
  onEdit,
  pending = false,
}: TaskRowProps) {
  const { getProject } = useProjects();
  const project = task.projectId ? getProject(task.projectId) : undefined;
  const overdue = isOverdue(task);
  const done = task.status === "done";

  return (
    <div
      className={`group flex items-start gap-3 rounded-md px-2 py-2 transition-opacity duration-1000 hover:bg-hover ${
        pending ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={done || pending}
          onChange={() => onToggleComplete(task.id)}
          label={task.title}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-tight ${
            done ? "text-muted line-through" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        {(project || task.due || task.recurrence || task.notes || (task.attachments?.length ?? 0) > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide">
            {project && (
              <span className="flex items-center gap-1 text-muted">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden="true"
                />
                {project.name}
              </span>
            )}
            {task.due && (
              <span className={overdue ? "text-accent" : "text-muted"}>
                {dueLabel(task.due)}
              </span>
            )}
            {task.recurrence && (
              <span className="text-muted">↻ {task.recurrence}</span>
            )}
            {task.notes && <span className="text-muted">Notes</span>}
            {(task.attachments?.length ?? 0) > 0 && (
              <span className="text-muted">
                {task.attachments!.length} file{task.attachments!.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>

      <a
        href={thingsAddUrl(task, project?.name)}
        title="Send to Things"
        className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-foreground group-hover:opacity-100"
      >
        Things
      </a>

      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-foreground group-hover:opacity-100"
        >
          Edit
        </button>
      )}

      {onToggleStar && (
        <button
          type="button"
          onClick={() => onToggleStar(task.id)}
          aria-label={task.starred ? "Remove from Top 3" : "Add to Top 3"}
          aria-pressed={task.starred}
          className={`shrink-0 rounded p-0.5 text-base leading-none transition-colors ${
            task.starred
              ? "text-accent"
              : "text-neutral-300 opacity-0 hover:text-neutral-400 group-hover:opacity-100"
          }`}
        >
          {task.starred ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}
