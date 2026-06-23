"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import SectionHeading from "@/components/SectionHeading";
import TaskRow from "@/components/TaskRow";
import CalendarList from "@/components/CalendarList";
import RoutineTracker from "@/components/RoutineTracker";
import {
  HABITS,
  OPEN_TASKS,
  TOP_THREE,
  UPCOMING_EVENTS,
  type Habit,
  type Task,
} from "@/lib/data";

function formatToday(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const [topThree, setTopThree] = useState<Task[]>(TOP_THREE);
  const [openTasks, setOpenTasks] = useState<Task[]>(OPEN_TASKS);
  const [habits, setHabits] = useState<Habit[]>(HABITS);

  const today = new Date();

  const toggleTask = (
    setter: React.Dispatch<React.SetStateAction<Task[]>>,
    id: string,
  ) => {
    setter((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h)),
    );
  };

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
                {formatToday(today)}
              </h1>
            </header>

            {/* Top 3 for today */}
            <section className="mb-9">
              <SectionHeading title="Top 3 for Today" />
              <div className="flex flex-col">
                {topThree.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    starred
                    onToggle={(id) => toggleTask(setTopThree, id)}
                  />
                ))}
                {topThree.length < 3 && (
                  <div className="px-2 py-2 text-sm italic text-muted">
                    (open spot)
                  </div>
                )}
                <p className="px-2 pt-1 text-xs text-muted">
                  Star a task below to set it as today&apos;s top 3.
                </p>
              </div>
            </section>

            {/* Calendar / agenda */}
            <div className="mb-9">
              <CalendarList events={UPCOMING_EVENTS} />
            </div>

            {/* All open tasks */}
            <section>
              <SectionHeading
                title={`All Open · ${openTasks.filter((t) => !t.done).length}`}
              />
              <div className="flex flex-col">
                {openTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(id) => toggleTask(setOpenTasks, id)}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right column — routines / habit tracker */}
          <div className="w-72 shrink-0">
            <RoutineTracker habits={habits} onToggle={toggleHabit} />
          </div>
        </div>
      </main>
    </div>
  );
}
