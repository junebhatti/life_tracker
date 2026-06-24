// Routine model: a recurring daily habit tracked by date-keyed completion
// history, grouped by time of day, with an optional streak goal.

export type RoutinePeriod = "Morning" | "Afternoon" | "Evening";

export const ROUTINE_PERIODS: RoutinePeriod[] = ["Morning", "Afternoon", "Evening"];

export type Routine = {
  id: string;
  title: string;
  description?: string;
  period: RoutinePeriod;
  /** Optional target streak (consecutive days) to work toward. */
  streakGoal?: number;
  /** Local-time YYYY-MM-DD keys on which this routine was completed. */
  history: string[];
  createdAt: string;
};

export type NewRoutineInput = {
  title: string;
  description?: string;
  period?: RoutinePeriod;
  streakGoal?: number;
};

/** Local-time YYYY-MM-DD key, so a routine resets at local midnight rather than UTC. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + delta));
}

export function isDoneToday(routine: Routine): boolean {
  return routine.history.includes(todayKey());
}

/** Consecutive-day streak ending today, or ending yesterday if today hasn't
 *  been checked off yet, so the streak doesn't visibly drop to 0 until a day
 *  is actually missed. */
export function routineStreak(routine: Routine): number {
  const done = new Set(routine.history);
  let cursor = done.has(todayKey()) ? todayKey() : shiftDays(todayKey(), -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Clean-slate seed: no routines until the user adds their own. */
export function seedRoutines(): Routine[] {
  return [];
}
