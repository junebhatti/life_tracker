"use client";

import Link from "next/link";
import Checkbox from "./Checkbox";
import SectionHeading from "./SectionHeading";
import { useRoutines } from "./RoutineStore";
import { ROUTINE_PERIODS, isDoneToday, routineStreak } from "@/lib/routines";

/** Daily routine / habit tracker, grouped by part of day with streak counts. */
export default function RoutineTracker() {
  const { routines, toggleToday } = useRoutines();
  const doneCount = routines.filter((r) => isDoneToday(r)).length;

  return (
    <section>
      <SectionHeading
        title={`Routines · ${doneCount}/${routines.length}`}
        action={
          <Link href="/routines" className="transition-colors hover:text-foreground">
            View all →
          </Link>
        }
      />

      <div className="flex flex-col gap-3 pt-1">
        {routines.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted">
            No routines yet.{" "}
            <Link
              href="/routines"
              className="text-foreground underline underline-offset-2"
            >
              Add one
            </Link>
            .
          </p>
        )}
        {ROUTINE_PERIODS.map((period) => {
          const items = routines.filter((r) => r.period === period);
          if (items.length === 0) return null;

          return (
            <div key={period}>
              <h3 className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                {period}
              </h3>
              <div className="flex flex-col">
                {items.map((routine) => {
                  const done = isDoneToday(routine);
                  return (
                    <div
                      key={routine.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover"
                    >
                      <Checkbox
                        checked={done}
                        onChange={() => toggleToday(routine.id)}
                        label={routine.title}
                      />
                      <span
                        className={`flex-1 text-sm leading-tight ${
                          done ? "text-muted line-through" : "text-foreground"
                        }`}
                      >
                        {routine.title}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] text-muted">
                        <span aria-hidden="true">🔥</span>
                        {routineStreak(routine)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
