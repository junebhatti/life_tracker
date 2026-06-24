"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  seedRoutines,
  todayKey,
  type NewRoutineInput,
  type Routine,
} from "@/lib/routines";

const STORAGE_KEY = "life-tracker:routines:v1";

type RoutineStore = {
  routines: Routine[];
  hydrated: boolean;
  addRoutine: (input: NewRoutineInput) => void;
  updateRoutine: (
    id: string,
    patch: Partial<Pick<Routine, "title" | "description" | "period" | "streakGoal">>,
  ) => void;
  deleteRoutine: (id: string) => void;
  /** Toggle whether this routine is marked done for today (not a global done flag). */
  toggleToday: (id: string) => void;
};

const RoutineContext = createContext<RoutineStore | null>(null);

function makeId() {
  return `routine_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function RoutineStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [routines, setRoutines] = useState<Routine[]>(() => seedRoutines());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Routine[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setRoutines(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [routines, hydrated]);

  const addRoutine = useCallback((input: NewRoutineInput) => {
    const routine: Routine = {
      id: makeId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      period: input.period ?? "Morning",
      streakGoal: input.streakGoal,
      history: [],
      createdAt: new Date().toISOString(),
    };
    setRoutines((prev) => [...prev, routine]);
  }, []);

  const updateRoutine = useCallback(
    (
      id: string,
      patch: Partial<Pick<Routine, "title" | "description" | "period" | "streakGoal">>,
    ) => {
      setRoutines((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const deleteRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleToday = useCallback((id: string) => {
    const key = todayKey();
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const done = r.history.includes(key);
        return {
          ...r,
          history: done
            ? r.history.filter((d) => d !== key)
            : [...r.history, key],
        };
      }),
    );
  }, []);

  return (
    <RoutineContext.Provider
      value={{
        routines,
        hydrated,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        toggleToday,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutines() {
  const ctx = useContext(RoutineContext);
  if (!ctx) {
    throw new Error("useRoutines must be used within a RoutineStoreProvider");
  }
  return ctx;
}
