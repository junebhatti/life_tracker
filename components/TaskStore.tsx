"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  seedTasks,
  type NewTaskInput,
  type Task,
} from "@/lib/tasks";

const STORAGE_KEY = "life-tracker:tasks:v1";

/** How long a checked task lingers (faded) before it commits to done. */
const COMPLETE_DELAY_MS = 2000;

type TaskStore = {
  tasks: Task[];
  /** False until the client has loaded state from storage. Gate date-relative
   *  UI on this to avoid server/client hydration mismatches. */
  hydrated: boolean;
  /** Ids of tasks checked but not yet committed to done (grace period). */
  pendingIds: string[];
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleComplete: (id: string) => void;
  toggleStar: (id: string) => void;
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
};

const TaskContext = createContext<TaskStore | null>(null);

function makeId() {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function TaskStoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => seedTasks());
  const [hydrated, setHydrated] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  // Latest tasks, readable from event callbacks without re-creating them.
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  // Active grace-period timers, keyed by task id.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Clear any outstanding timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  // Load saved tasks from localStorage once, on mount. Until this runs, the
  // consumers render a placeholder (gated on `hydrated`), so the server HTML
  // and the first client render match.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  // Persist on every change after the initial load.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [tasks, hydrated]);

  const addTask = useCallback((input: NewTaskInput) => {
    const task: Task = {
      id: makeId(),
      title: input.title.trim(),
      projectId: input.projectId,
      due: input.due,
      recurrence: input.recurrence,
      starred: input.starred ?? false,
      status: input.status ?? "open",
      createdAt: new Date().toISOString(),
      completedAt: input.status === "done" ? new Date().toISOString() : undefined,
    };
    setTasks((prev) => [task, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return;

    // Mid grace period: a second click cancels the pending completion
    // (the "oops, keep it" case) and leaves the task open.
    const existing = timers.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timers.current.delete(id);
      setPendingIds((prev) => prev.filter((p) => p !== id));
      return;
    }

    // Re-open an already-completed task immediately (no delay needed).
    if (task.status === "done") {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "open", completedAt: undefined } : t,
        ),
      );
      return;
    }

    // Open task: hold it (faded) for a couple seconds before committing,
    // so an accidental click can be undone by clicking again.
    setPendingIds((prev) => [...prev, id]);
    const timer = setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "done", completedAt: new Date().toISOString() }
            : t,
        ),
      );
      setPendingIds((prev) => prev.filter((p) => p !== id));
      timers.current.delete(id);
    }, COMPLETE_DELAY_MS);
    timers.current.set(id, timer);
  }, []);

  const toggleStar = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)),
    );
  }, []);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "open", completedAt: undefined } : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
      setPendingIds((prev) => prev.filter((p) => p !== id));
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        hydrated,
        pendingIds,
        addTask,
        updateTask,
        toggleComplete,
        toggleStar,
        restoreTask,
        deleteTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks must be used within a TaskStoreProvider");
  }
  return ctx;
}
