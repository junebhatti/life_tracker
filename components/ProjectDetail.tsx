"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Checkbox from "./Checkbox";
import TaskRow from "./TaskRow";
import NewTaskForm from "./NewTaskForm";
import { useProjects } from "./ProjectStore";
import { useTasks } from "./TaskStore";
import type { Task } from "@/lib/tasks";
import {
  MILESTONE_WEIGHT_MAX,
  MILESTONE_WEIGHT_MIN,
  PROJECT_COLORS,
  RECURRENCE_LABELS,
  clampMilestoneWeight,
  projectHours,
  projectProgress,
  type ChecklistRecurrence,
} from "@/lib/projects";

function targetLabel(target?: string) {
  if (!target) return null;
  const [y, m, d] = target.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `Target ${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;
}

function activityTime(at: string) {
  return new Date(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const {
    hydrated,
    getProject,
    updateProject,
    deleteProject,
    addMilestone,
    updateMilestone,
    toggleMilestone,
    deleteMilestone,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addActivity,
  } = useProjects();
  const { tasks, pendingIds, toggleComplete, toggleStar } = useTasks();

  // Add-milestone form
  const [msTitle, setMsTitle] = useState("");
  const [msWeight, setMsWeight] = useState(MILESTONE_WEIGHT_MAX);
  // Edit-milestone form
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editWeight, setEditWeight] = useState(MILESTONE_WEIGHT_MAX);
  // Add-checklist form
  const [clTitle, setClTitle] = useState("");
  const [clRecur, setClRecur] = useState<ChecklistRecurrence>("one-shot");
  // Activity form
  const [actKind, setActKind] = useState<"work" | "update">("work");
  const [actNote, setActNote] = useState("");
  const [actHours, setActHours] = useState("");
  const [actMinutes, setActMinutes] = useState("");
  // New task modal
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Compact color popover (opened from the small dot next to the title)
  const [showColors, setShowColors] = useState(false);

  const project = getProject(id);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="h-8 w-72 animate-pulse rounded bg-hover" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <p className="text-sm text-muted">
          Project not found.{" "}
          <Link href="/projects" className="text-foreground underline">
            Back to Projects
          </Link>
        </p>
      </div>
    );
  }

  const progress = projectProgress(project);
  const hours = projectHours(project);
  const openTasks = tasks.filter(
    (t) => t.projectId === project.id && t.status === "open",
  );

  const submitMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    addMilestone(project.id, msTitle, clampMilestoneWeight(msWeight));
    setMsTitle("");
    setMsWeight(MILESTONE_WEIGHT_MAX);
  };

  const startEditMilestone = (milestoneId: string, title: string, weight: number) => {
    setEditingMilestoneId(milestoneId);
    setEditTitle(title);
    setEditWeight(weight);
  };

  const cancelEditMilestone = () => {
    setEditingMilestoneId(null);
  };

  const submitEditMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestoneId || !editTitle.trim()) return;
    updateMilestone(project.id, editingMilestoneId, {
      title: editTitle,
      weight: clampMilestoneWeight(editWeight),
    });
    setEditingMilestoneId(null);
  };

  const handleDeleteProject = () => {
    if (
      !window.confirm(
        `Delete "${project.name}"? This removes all its milestones, checklist items, and activity. This can't be undone.`,
      )
    ) {
      return;
    }
    deleteProject(project.id);
    router.push("/projects");
  };

  const submitChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clTitle.trim()) return;
    addChecklistItem(project.id, clTitle, clRecur);
    setClTitle("");
    setClRecur("one-shot");
  };

  const submitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actNote.trim()) return;
    const minutes =
      actKind === "work"
        ? (Number(actHours) || 0) * 60 + (Number(actMinutes) || 0)
        : undefined;
    addActivity(project.id, { kind: actKind, note: actNote, minutes });
    setActNote("");
    setActHours("");
    setActMinutes("");
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/projects"
        className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
      >
        ← Projects
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          {project.client && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
              {project.client}
            </p>
          )}
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
            <span className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowColors((v) => !v)}
                aria-label="Change project color"
                title="Change color"
                className="h-3 w-3 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-neutral-300"
                style={{ backgroundColor: project.color }}
              />
              {showColors && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setShowColors(false)}
                  />
                  <div className="absolute left-0 top-6 z-20 flex w-[128px] flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2 shadow-lg">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          updateProject(project.id, { color: c });
                          setShowColors(false);
                        }}
                        aria-label={`Set color ${c}`}
                        className={`h-5 w-5 rounded-full border-2 transition ${
                          project.color === c
                            ? "border-[#2323e8]"
                            : "border-transparent hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </>
              )}
            </span>
            {project.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
          {targetLabel(project.target) && (
            <span className="whitespace-nowrap text-xs text-muted">
              {targetLabel(project.target)}
            </span>
          )}
          <button
            type="button"
            onClick={handleDeleteProject}
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
          >
            Delete project
          </button>
        </div>
      </div>

      {/* Hours */}
      <Section title="Hours">
        <p className="text-3xl font-semibold text-foreground">
          {hours.toFixed(1)}
        </p>
      </Section>

      {/* Milestones */}
      <Section title={`Milestones · ${progress.pct}%`}>
        <div className="flex flex-col">
          {project.milestones.map((m) =>
            editingMilestoneId === m.id ? (
              <form
                key={m.id}
                onSubmit={submitEditMilestone}
                className="flex items-center gap-2 border-b border-border py-2"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  aria-label="Milestone title"
                  className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
                  autoFocus
                />
                <input
                  type="number"
                  min={MILESTONE_WEIGHT_MIN}
                  max={MILESTONE_WEIGHT_MAX}
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  aria-label="Milestone weight"
                  className="w-16 rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
                />
                <button
                  type="submit"
                  className="rounded-md bg-[#2323e8] px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditMilestone}
                  className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div
                key={m.id}
                className="group flex items-center gap-3 border-b border-border py-2"
              >
                <Checkbox
                  checked={m.done}
                  onChange={() => toggleMilestone(project.id, m.id)}
                  label={m.title}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      m.done ? "text-muted line-through" : "text-foreground"
                    }`}
                  >
                    {m.title}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Weight {m.weight}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditMilestone(m.id, m.title, m.weight)}
                  className="text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-foreground group-hover:opacity-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteMilestone(project.id, m.id)}
                  className="text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            ),
          )}
          {project.milestones.length === 0 && (
            <p className="py-2 text-sm text-muted">No milestones yet.</p>
          )}
        </div>

        <form onSubmit={submitMilestone} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="+ Add milestone…"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
          <input
            type="number"
            min={MILESTONE_WEIGHT_MIN}
            max={MILESTONE_WEIGHT_MAX}
            value={msWeight}
            onChange={(e) => setMsWeight(Number(e.target.value))}
            aria-label="Milestone weight"
            className="w-16 rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            className="rounded-md bg-[#2323e8] px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
          >
            Add
          </button>
        </form>
      </Section>

      {/* Open tasks (live in the global task list, tagged to this project) */}
      <Section
        title={`Open Tasks · ${openTasks.length}`}
        action={
          <button
            type="button"
            onClick={() => setShowTaskForm(true)}
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            + Add task
          </button>
        }
      >
        <div className="flex flex-col">
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              pending={pendingIds.includes(task.id)}
              onToggleComplete={toggleComplete}
              onToggleStar={toggleStar}
              onEdit={setEditingTask}
            />
          ))}
          {openTasks.length === 0 && (
            <p className="py-2 text-sm text-muted">No open tasks.</p>
          )}
        </div>
      </Section>

      {/* Checklist */}
      <Section title="Checklist">
        {project.checklist.length === 0 && (
          <p className="text-sm text-muted">
            No checklist yet. Use this for granular sub-steps that don’t warrant a
            full task or milestone. Recurring items (weekly status report, monthly
            invoice…) live well here too.
          </p>
        )}
        <div className="flex flex-col">
          {project.checklist.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 border-b border-border py-2"
            >
              <Checkbox
                checked={c.done}
                onChange={() => toggleChecklistItem(project.id, c.id)}
                label={c.title}
              />
              <span
                className={`min-w-0 flex-1 text-sm ${
                  c.done ? "text-muted line-through" : "text-foreground"
                }`}
              >
                {c.title}
              </span>
              {c.recurrence !== "one-shot" && (
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {RECURRENCE_LABELS[c.recurrence]}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteChecklistItem(project.id, c.id)}
                className="text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submitChecklist} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={clTitle}
            onChange={(e) => setClTitle(e.target.value)}
            placeholder="+ Add a checklist item…"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
          <select
            value={clRecur}
            onChange={(e) => setClRecur(e.target.value as ChecklistRecurrence)}
            className="rounded-md border border-border px-2 py-2 text-xs uppercase tracking-wider text-muted outline-none focus:border-neutral-400"
          >
            {(Object.keys(RECURRENCE_LABELS) as ChecklistRecurrence[]).map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[#2323e8] px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
          >
            Add
          </button>
        </form>
      </Section>

      {/* Activity log */}
      <Section title={`Activity · ${project.activity.length}`}>
        <form
          onSubmit={submitActivity}
          className="rounded-lg border border-border p-4"
        >
          <div className="mb-3 flex gap-1">
            {(["work", "update"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setActKind(k)}
                className={`rounded px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                  actKind === k
                    ? "bg-[#2323e8] text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={actNote}
            onChange={(e) => setActNote(e.target.value)}
            placeholder={
              actKind === "work" ? "What did you work on?" : "Post an update…"
            }
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            {actKind === "work" ? (
              <div className="flex items-center gap-1 text-sm text-muted">
                <input
                  type="number"
                  min={0}
                  value={actHours}
                  onChange={(e) => setActHours(e.target.value)}
                  placeholder="0"
                  aria-label="Hours"
                  className="w-14 rounded-md border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-neutral-400"
                />
                h
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={actMinutes}
                  onChange={(e) => setActMinutes(e.target.value)}
                  placeholder="00"
                  aria-label="Minutes"
                  className="ml-2 w-14 rounded-md border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-neutral-400"
                />
                m
              </div>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="rounded-md bg-[#2323e8] px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
            >
              Log
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-col">
          {project.activity.map((a) => (
            <div key={a.id} className="border-b border-border py-3">
              <p className="text-sm text-foreground">{a.note}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                {a.kind === "work" && a.minutes
                  ? `${(a.minutes / 60).toFixed(2)}h · `
                  : ""}
                {a.kind} · {activityTime(a.at)}
              </p>
            </div>
          ))}
          {project.activity.length === 0 && (
            <p className="py-2 text-sm text-muted">No activity logged yet.</p>
          )}
        </div>
      </Section>

      {showTaskForm && (
        <NewTaskForm
          defaultProjectId={project.id}
          onClose={() => setShowTaskForm(false)}
        />
      )}
      {editingTask && (
        <NewTaskForm task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between border-b border-border pb-1">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
