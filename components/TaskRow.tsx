"use client";

import Checkbox from "./Checkbox";
import type { Task } from "@/lib/data";

type TaskRowProps = {
  task: Task;
  onToggle: (id: string) => void;
  /** Show a star toggle on the right (used in the Top 3 list). */
  starred?: boolean;
};

/** A single task line: checkbox, title, and meta tags (project / due / recurrence). */
export default function TaskRow({ task, onToggle, starred }: TaskRowProps) {
  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <div className="pt-0.5">
        <Checkbox
          checked={task.done}
          onChange={() => onToggle(task.id)}
          label={task.title}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-tight ${
            task.done ? "text-muted line-through" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        {(task.project || task.due || task.recurrence) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide">
            {task.project && (
              <span className="text-muted">{task.project}</span>
            )}
            {task.due && (
              <span className={task.overdue ? "text-accent" : "text-muted"}>
                {task.due}
              </span>
            )}
            {task.recurrence && (
              <span className="text-muted">↻ {task.recurrence}</span>
            )}
          </div>
        )}
      </div>

      {starred && (
        <span className="text-accent" aria-hidden="true">
          ★
        </span>
      )}
    </div>
  );
}
