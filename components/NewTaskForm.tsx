"use client";

import { useEffect, useState } from "react";
import { useProjects } from "./ProjectStore";
import { useTasks } from "./TaskStore";
import type { Task, TaskStatus } from "@/lib/tasks";

type NewTaskFormProps = {
  onClose: () => void;
  /** Pre-select a project (used when adding a task from a project page). */
  defaultProjectId?: string;
  /** When provided, the form edits this task instead of creating a new one. */
  task?: Task;
};

/** Modal form for creating or editing a task (title, project, due, status, star). */
export default function NewTaskForm({
  onClose,
  defaultProjectId,
  task,
}: NewTaskFormProps) {
  const { addTask, updateTask } = useTasks();
  const { projects } = useProjects();

  const editing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProjectId ?? "",
  );
  const [due, setDue] = useState(task?.due ?? "");
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "open");
  const [starred, setStarred] = useState(task?.starred ?? false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editing) {
      updateTask(task.id, {
        title: title.trim(),
        projectId: projectId || undefined,
        due: due || undefined,
        recurrence: recurrence.trim() || undefined,
        status,
        starred,
        completedAt:
          status === "done"
            ? task.completedAt ?? new Date().toISOString()
            : undefined,
      });
    } else {
      addTask({
        title,
        projectId: projectId || undefined,
        due: due || undefined,
        recurrence: recurrence.trim() || undefined,
        status,
        starred,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {editing ? "Edit task" : "New task"}
        </h2>

        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task name"
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Due date
            </span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Repeat (optional)
            </span>
            <input
              type="text"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              placeholder="e.g. Weekly"
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Status
            </span>
            <div className="flex rounded-md border border-border p-0.5">
              {(["open", "done"] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    status === s
                      ? "bg-neutral-800 text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {s === "open" ? "Open (live)" : "Done"}
                </button>
              ))}
            </div>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={starred}
            onChange={(e) => setStarred(e.target.checked)}
            className="h-4 w-4 accent-neutral-800"
          />
          Star as a Top 3 for today
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            {editing ? "Save" : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}
