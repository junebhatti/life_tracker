"use client";

import { useEffect, useState } from "react";
import { ROUTINE_PERIODS, type RoutinePeriod } from "@/lib/routines";
import { useRoutines } from "./RoutineStore";

type NewRoutineFormProps = {
  onClose: () => void;
};

/** Modal form for creating a routine. */
export default function NewRoutineForm({ onClose }: NewRoutineFormProps) {
  const { addRoutine } = useRoutines();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<RoutinePeriod>("Morning");
  const [streakGoal, setStreakGoal] = useState("");

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
    addRoutine({
      title,
      description: description || undefined,
      period,
      streakGoal: streakGoal ? Number(streakGoal) : undefined,
    });
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
          New routine
        </h2>

        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Routine name"
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="mt-3 w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
        />

        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Time of day
          </span>
          <div className="flex flex-wrap gap-1 rounded-md border border-border p-0.5">
            {ROUTINE_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  period === p
                    ? "bg-neutral-800 text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex max-w-[12rem] flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Streak goal
          </span>
          <input
            type="number"
            min={0}
            value={streakGoal}
            onChange={(e) => setStreakGoal(e.target.value)}
            placeholder="e.g. 30 days"
            className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
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
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
