"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  todayKey,
  type NewRoutineInput,
  type Routine,
  type RoutinePeriod,
} from "@/lib/routines";

type RoutineRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  period: string;
  streak_goal: number | null;
  history: string[];
  created_at: string;
};

function fromRow(row: RoutineRow): Routine {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    period: row.period as RoutinePeriod,
    streakGoal: row.streak_goal ?? undefined,
    history: row.history ?? [],
    createdAt: row.created_at,
  };
}

function toRow(routine: Routine, userId: string): RoutineRow {
  return {
    id: routine.id,
    user_id: userId,
    title: routine.title,
    description: routine.description ?? null,
    period: routine.period,
    streak_goal: routine.streakGoal ?? null,
    history: routine.history,
    created_at: routine.createdAt,
  };
}

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
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const routinesRef = useRef(routines);
  useEffect(() => {
    routinesRef.current = routines;
  }, [routines]);

  // Load this user's routines from Supabase, then subscribe to row changes
  // so edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoutines([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load routines", error);
        } else if (data) {
          setRoutines((data as RoutineRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`routines:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "routines",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setRoutines((prev) => prev.filter((r) => r.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as RoutineRow);
          setRoutines((prev) => {
            const idx = prev.findIndex((r) => r.id === next.id);
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addRoutine = useCallback(
    (input: NewRoutineInput) => {
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
      if (user) {
        supabase
          .from("routines")
          .insert(toRow(routine, user.id))
          .then(({ error }) => {
            if (error) console.error("Failed to save routine", error);
          });
      }
    },
    [user],
  );

  const updateRoutine = useCallback(
    (
      id: string,
      patch: Partial<Pick<Routine, "title" | "description" | "period" | "streakGoal">>,
    ) => {
      setRoutines((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      if (!user) return;
      const rowPatch: Record<string, unknown> = {};
      if ("title" in patch) rowPatch.title = patch.title;
      if ("description" in patch) rowPatch.description = patch.description ?? null;
      if ("period" in patch) rowPatch.period = patch.period;
      if ("streakGoal" in patch) rowPatch.streak_goal = patch.streakGoal ?? null;
      supabase
        .from("routines")
        .update(rowPatch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to update routine", error);
        });
    },
    [user],
  );

  const deleteRoutine = useCallback(
    (id: string) => {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      if (!user) return;
      supabase
        .from("routines")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete routine", error);
        });
    },
    [user],
  );

  const toggleToday = useCallback(
    (id: string) => {
      const key = todayKey();
      let nextHistory: string[] | undefined;
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const done = r.history.includes(key);
          nextHistory = done
            ? r.history.filter((d) => d !== key)
            : [...r.history, key];
          return { ...r, history: nextHistory };
        }),
      );
      if (!user || !nextHistory) return;
      supabase
        .from("routines")
        .update({ history: nextHistory })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to update routine streak", error);
        });
    },
    [user],
  );

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
