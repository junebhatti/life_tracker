"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import SectionHeading from "@/components/SectionHeading";
import TaskRow from "@/components/TaskRow";
import CalendarList from "@/components/CalendarList";
import HealthSnapshot from "@/components/HealthSnapshot";
import RoutineTracker from "@/components/RoutineTracker";
import NewTaskForm from "@/components/NewTaskForm";
import { useTasks } from "@/components/TaskStore";
import { useState } from "react";
import type { Task } from "@/lib/tasks";

function formatToday(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Placeholder rows shown until the task store has hydrated from storage. */
function TaskSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-hover" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-hover" />
        </div>
      ))}
    </div>
  );
}

export default function TodayPage() {
  const { tasks, hydrated, pendingIds, toggleComplete, toggleStar } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = new Date();

  const openTasks = tasks.filter((t) => t.status === "open");
  const topThree = openTasks.filter((t) => t.starred);
  const otherOpen = openTasks.filter((t) => !t.starred);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl gap-10 px-8 py-10">
          {/* Center column */}
          <div className="min-w-0 flex-1">
            <header className="mb-8">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Today
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {hydrated ? (
                  formatToday(today)
                ) : (
                  <span className="inline-block h-8 w-64 animate-pulse rounded bg-hover align-middle" />
                )}
              </h1>
            </header>

            {/* Top 3 for today (starred open tasks) */}
            <section className="mb-9">
              <SectionHeading title="Top 3 for Today" />
              <div className="flex flex-col">
                {!hydrated ? (
                  <TaskSkeleton rows={2} />
                ) : (
                  <>
                    {topThree.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        pending={pendingIds.includes(task.id)}
                        onToggleComplete={toggleComplete}
                        onToggleStar={toggleStar}
                        onEdit={setEditingTask}
                      />
                    ))}
                    {topThree.length < 3 && (
                      <div className="px-2 py-2 text-sm italic text-muted">
                        (open spot)
                      </div>
                    )}
                    <p className="px-2 pt-1 text-xs text-muted">
                      Tap the star on any task below to set it as a top 3 for
                      today.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Calendar / agenda */}
            <div className="mb-9">
              <CalendarList />
            </div>

            {/* All open tasks */}
            <section>
              <SectionHeading
                title={`All Open${hydrated ? ` · ${otherOpen.length}` : ""}`}
                action={
                  <Link
                    href="/tasks?new=1"
                    className="transition-colors hover:text-foreground"
                  >
                    + Add task
                  </Link>
                }
              />
              <div className="flex flex-col">
                {!hydrated ? (
                  <TaskSkeleton rows={4} />
                ) : (
                  <>
                    {otherOpen.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        pending={pendingIds.includes(task.id)}
                        onToggleComplete={toggleComplete}
                        onToggleStar={toggleStar}
                        onEdit={setEditingTask}
                      />
                    ))}
                    {otherOpen.length === 0 && (
                      <p className="px-2 py-3 text-sm text-muted">
                        No open tasks.{" "}
                        <Link
                          href="/tasks?new=1"
                          className="text-foreground underline underline-offset-2"
                        >
                          Add one
                        </Link>
                        .
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Right column — routines / habit tracker + health snapshot */}
          <div className="flex w-72 shrink-0 flex-col gap-9">
            <RoutineTracker />
            <HealthSnapshot />
          </div>
        </div>
      </main>

      {editingTask && (
        <NewTaskForm task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
