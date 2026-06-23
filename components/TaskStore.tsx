"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  seedTasks,
  type NewTaskInput,
  type Task,
} from "@/lib/tasks";

const STORAGE_KEY = "life-tracker:tasks:v1";

type TaskStore = {
  tasks: Task[];
  /** False until the client has loaded state from storage. Gate date-relative
   *  UI on this to avoid server/client hydration mismatches. */
  hydrated: boolean;
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
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const done = t.status === "open";
        return {
          ...t,
          status: done ? "done" : "open",
          completedAt: done ? new Date().toISOString() : undefined,
        };
      }),
    );
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
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        hydrated,
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
