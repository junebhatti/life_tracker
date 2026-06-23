"use client";

import Checkbox from "./Checkbox";
import { getProject } from "@/lib/projects";
import { dueLabel, isOverdue, type Task } from "@/lib/tasks";

type TaskRowProps = {
  task: Task;
  onToggleComplete: (id: string) => void;
  /** When provided, a clickable star is shown (toggles "Top 3 for Today"). */
  onToggleStar?: (id: string) => void;
};

/** A single task line: checkbox, title, project/due/recurrence tags, star. */
export default function TaskRow({
  task,
  onToggleComplete,
  onToggleStar,
}: TaskRowProps) {
  const project = getProject(task.projectId);
  const overdue = isOverdue(task);
  const done = task.status === "done";

  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <div className="pt-0.5">
        <Checkbox
          checked={done}
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
        {(project || task.due || task.recurrence) && (
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
          </div>
        )}
      </div>

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
