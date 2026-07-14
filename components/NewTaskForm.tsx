"use client";

import { useEffect, useRef, useState } from "react";
import { useProjects } from "./ProjectStore";
import { useTasks } from "./TaskStore";
import { useAuth } from "./AuthProvider";
import type { Task, TaskAttachment, TaskStatus } from "@/lib/tasks";

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
  const { session } = useAuth();
  const token = session?.access_token;

  const editing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProjectId ?? "",
  );
  const [due, setDue] = useState(task?.due ?? "");
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "open");
  const [starred, setStarred] = useState(task?.starred ?? false);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/tasks/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body,
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; name?: string; error?: string };
        if (!res.ok || !json.url) {
          setUploadError(json.error ?? "Upload failed.");
          continue;
        }
        setAttachments((prev) => [...prev, { name: json.name ?? file.name, url: json.url! }]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
        notes: notes.trim() || undefined,
        attachments,
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
        notes: notes.trim() || undefined,
        attachments,
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
                      ? "bg-[#2323e8] text-white"
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

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything you'll need to pick this up later…"
            className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
        </label>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Files
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-[11px] font-medium uppercase tracking-wider text-[#2323e8] hover:text-[#1c1cba] disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "+ Attach file"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          {attachments.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {attachments.map((a, i) => (
                <li
                  key={`${a.url}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-foreground underline underline-offset-2 hover:text-[#2323e8]"
                  >
                    {a.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-[11px] uppercase tracking-wider text-muted hover:text-accent"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
            className="rounded-md bg-[#2323e8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1c1cba] disabled:opacity-40"
          >
            {editing ? "Save" : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}
