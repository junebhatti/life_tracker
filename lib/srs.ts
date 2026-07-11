// Spaced-repetition scheduling, shared by the English + Urdu flashcard decks
// on web and mobile. Pure functions only — data access lives in the stores.
//
// The four grades map to how soon a card comes back:
//   No idea      → due immediately (resets spacing) — repeats very often
//   Needs work   → due tomorrow
//   Feeling good → a few days, growing each time
//   Mastered     → weeks, growing fast — almost never

export type Grade = "no_idea" | "needs_work" | "feeling_good" | "mastered";

/** Order + colors, so the deck UIs render the same buttons/stats everywhere. */
export const GRADES: { grade: Grade; label: string; color: string }[] = [
  { grade: "no_idea", label: "No idea", color: "#b23a2e" },
  { grade: "needs_work", label: "Needs work", color: "#8a6a3d" },
  { grade: "feeling_good", label: "Feeling good", color: "#2d7d7d" },
  { grade: "mastered", label: "Mastered", color: "#3d6b57" },
];

/** Within one sitting, "hard" grades resurface the card this many positions
 *  ahead so you drill it again now; null grades leave the session deck (they
 *  aren't due again for days). */
export const SESSION_GAP: Record<Grade, number | null> = {
  no_idea: 2,
  needs_work: 6,
  feeling_good: null,
  mastered: null,
};

const DAY_MS = 86_400_000;
const MAX_INTERVAL_DAYS = 365;

export type ReviewState = {
  intervalDays: number;
  /** ISO timestamp of when this card becomes due again. */
  dueAt: string;
  reps: number;
};

/** Next schedule for a card given its previous state (undefined = brand new). */
export function nextReview(prev: ReviewState | undefined, grade: Grade, now: number = Date.now()): ReviewState {
  const interval = prev?.intervalDays ?? 0;
  const reps = (prev?.reps ?? 0) + 1;

  let next: number;
  switch (grade) {
    case "no_idea":
      next = 0; // due right away — comes back this session and next
      break;
    case "needs_work":
      next = 1;
      break;
    case "feeling_good":
      next = interval < 1 ? 3 : interval * 2.5;
      break;
    case "mastered":
      next = interval < 7 ? 21 : interval * 3;
      break;
  }
  next = Math.min(next, MAX_INTERVAL_DAYS);

  return { intervalDays: next, dueAt: new Date(now + next * DAY_MS).toISOString(), reps };
}

/** A card with no schedule yet, or whose due time has passed, is due to study. */
export function isDue(state: ReviewState | undefined, now: number = Date.now()): boolean {
  if (!state) return true;
  return new Date(state.dueAt).getTime() <= now;
}

/** Namespaced key so English + Urdu ids can never collide in one table. */
export function cardKeyFor(deck: "english" | "urdu", cardId: string): string {
  return `${deck}:${cardId}`;
}
