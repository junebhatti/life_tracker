"use client";

import Checkbox from "./Checkbox";
import SectionHeading from "./SectionHeading";
import { HABIT_PERIODS, type Habit } from "@/lib/data";

type RoutineTrackerProps = {
  habits: Habit[];
  onToggle: (id: string) => void;
};

/** Daily routine / habit tracker, grouped by part of day with streak counts. */
export default function RoutineTracker({ habits, onToggle }: RoutineTrackerProps) {
  const doneCount = habits.filter((h) => h.done).length;

  return (
    <section>
      <SectionHeading
        title={`Routines · ${doneCount}/${habits.length}`}
        action={
          <span className="transition-colors hover:text-foreground">
            View all →
          </span>
        }
      />

      <div className="flex flex-col gap-3 pt-1">
        {HABIT_PERIODS.map((period) => {
          const items = habits.filter((h) => h.period === period);
          if (items.length === 0) return null;

          return (
            <div key={period}>
              <h3 className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                {period}
              </h3>
              <div className="flex flex-col">
                {items.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover"
                  >
                    <Checkbox
                      checked={habit.done}
                      onChange={() => onToggle(habit.id)}
                      label={habit.title}
                    />
                    <span
                      className={`flex-1 text-sm leading-tight ${
                        habit.done ? "text-muted line-through" : "text-foreground"
                      }`}
                    >
                      {habit.title}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-muted">
                      <span aria-hidden="true">🔥</span>
                      {habit.streak}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
