"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import {
  DUE_GROUP_ORDER,
  dueGroup,
  type DueGroup,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";
import { useTasks } from "./TaskStore";
import TaskRow from "./TaskRow";
import NewTaskForm from "./NewTaskForm";

type Tab = "tasks" | "archived";
type StatusFilter = TaskStatus | "all";
type ProjectFilter = "all" | "none" | string;

export default function TasksWorkspace() {
  const { tasks, hydrated, toggleComplete, toggleStar, restoreTask, deleteTask } =
    useTasks();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>("tasks");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  // Open the new-task form immediately when arriving via /tasks?new=1 (from Today).
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1");

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (projectFilter === "none" && t.projectId) return false;
      if (
        projectFilter !== "all" &&
        projectFilter !== "none" &&
        t.projectId !== projectFilter
      )
        return false;
      return true;
    });
  }, [tasks, statusFilter, projectFilter]);

  const grouped = useMemo(() => {
    const map = new Map<DueGroup, Task[]>();
    for (const t of visible) {
      const g = dueGroup(t);
      const list = map.get(g) ?? [];
      list.push(t);
      map.set(g, list);
    }
    return map;
  }, [visible]);

  const archived = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [tasks],
  );

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            {tab === "tasks" ? "All Tasks" : "Archived Tasks"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {tab === "tasks" ? "Tasks" : "Archived"}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="text-xs text-muted">
            {!hydrated
              ? " "
              : tab === "tasks"
                ? `${visible.length} of ${tasks.length}`
                : `${archived.length} archived`}
          </span>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {(["tasks", "archived"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? "border-neutral-800 font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "tasks" ? "Tasks" : "Archived"}
          </button>
        ))}
      </div>

      {!hydrated ? (
        <div className="mt-8 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2">
              <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-hover" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-hover" />
            </div>
          ))}
        </div>
      ) : tab === "tasks" ? (
        <>
          {/* Filters */}
          <div className="mt-6 space-y-3">
            <FilterRow label="Status">
              {(["open", "done", "all"] as StatusFilter[]).map((s) => (
                <Chip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Project">
              <Chip
                active={projectFilter === "all"}
                onClick={() => setProjectFilter("all")}
              >
                All
              </Chip>
              <Chip
                active={projectFilter === "none"}
                onClick={() => setProjectFilter("none")}
              >
                No project
              </Chip>
              {PROJECTS.map((p) => (
                <Chip
                  key={p.id}
                  active={projectFilter === p.id}
                  onClick={() => setProjectFilter(p.id)}
                  color={p.color}
                >
                  {p.name}
                </Chip>
              ))}
            </FilterRow>
          </div>

          {/* Grouped list */}
          <div className="mt-8 space-y-7">
            {visible.length === 0 && (
              <p className="text-sm text-muted">No tasks match these filters.</p>
            )}
            {DUE_GROUP_ORDER.map((group) => {
              const list = grouped.get(group);
              if (!list || list.length === 0) return null;
              return (
                <section key={group}>
                  <h2 className="mb-1 border-b border-border pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                    {group} · {list.length}
                  </h2>
                  <div className="flex flex-col">
                    {list.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggleComplete={toggleComplete}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        /* Archived tab */
        <div className="mt-8 flex flex-col">
          {archived.length === 0 && (
            <p className="text-sm text-muted">
              No archived tasks yet. Completing a task moves it here.
            </p>
          )}
          {archived.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-muted line-through">
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => restoreTask(task.id)}
                className="rounded px-2 py-1 text-xs text-muted opacity-0 transition-colors hover:text-foreground group-hover:opacity-100"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="rounded px-2 py-1 text-xs text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <NewTaskForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors ${
        active
          ? "border-neutral-800 bg-neutral-800 text-white"
          : "border-border text-muted hover:border-neutral-400 hover:text-foreground"
      }`}
    >
      {color && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
