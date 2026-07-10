"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Checkbox from "@/components/Checkbox";
import NewRoutineForm from "@/components/NewRoutineForm";
import { useRoutines } from "@/components/RoutineStore";
import { ROUTINE_PERIODS, isDoneToday, routineStreak } from "@/lib/routines";

export default function RoutinesPage() {
  const { routines, hydrated, toggleToday, deleteRoutine } = useRoutines();
  const [showForm, setShowForm] = useState(false);

  const doneToday = routines.filter((r) => isDoneToday(r)).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Daily
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                Routines
              </h1>
            </div>
            <span className="pt-1 text-xs text-muted">
              {hydrated ? `${doneToday}/${routines.length} done today` : " "}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-md bg-[#2323e8] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
            >
              + New Routine
            </button>
          </div>

          <div className="mt-8 space-y-8">
            {!hydrated && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded bg-hover"
                  />
                ))}
              </div>
            )}

            {hydrated && routines.length === 0 && (
              <p className="text-sm text-muted">
                No routines yet. Create one with “+ New Routine”.
              </p>
            )}

            {hydrated &&
              ROUTINE_PERIODS.map((period) => {
                const items = routines.filter((r) => r.period === period);
                if (items.length === 0) return null;
                return (
                  <section key={period}>
                    <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                      {period}
                    </h2>
                    <div className="flex flex-col">
                      {items.map((routine) => {
                        const done = isDoneToday(routine);
                        const streak = routineStreak(routine);
                        return (
                          <div
                            key={routine.id}
                            className="group flex items-start gap-3 border-b border-border py-3"
                          >
                            <Checkbox
                              checked={done}
                              onChange={() => toggleToday(routine.id)}
                              label={routine.title}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm ${
                                  done ? "text-muted line-through" : "text-foreground"
                                }`}
                              >
                                {routine.title}
                              </p>
                              {routine.description && (
                                <p className="mt-0.5 text-xs text-muted">
                                  {routine.description}
                                </p>
                              )}
                            </div>
                            <span className="flex items-center gap-0.5 whitespace-nowrap pt-0.5 text-[11px] text-muted">
                              <span aria-hidden="true">🔥</span>
                              {streak}
                              {routine.streakGoal ? `/${routine.streakGoal}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteRoutine(routine.id)}
                              className="text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
      </main>

      {showForm && <NewRoutineForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
