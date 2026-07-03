import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState, Platform } from "react-native";
import { supabase } from "../lib/supabase";

// Self-update (version.json polling + service worker) lives in App.tsx so it
// runs before the login gate.

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const SCRAP_KEY = process.env.EXPO_PUBLIC_SCRAPBOOK_KEY ?? "";
function scrapHeaders(): Record<string, string> {
  return SCRAP_KEY ? { "x-scrapbook-key": SCRAP_KEY } : {};
}

import type {
  ActivityEntry,
  AgendaEvent,
  CaptureKind,
  ChecklistItem,
  HealthData,
  HealthHistoryDay,
  LibraryCategory,
  LibraryFilter,
  LibraryNote,
  Milestone,
  Person,
  Project,
  ProjectType,
  Routine,
  ScrapItem,
  Task,
} from "../types";


// ---------------------------------------------------------------------------
// Supabase row types
// ---------------------------------------------------------------------------

type TaskRow = {
  id: string; title: string; starred: boolean; status: string;
  due?: string | null; recurrence?: string | null; project_id?: string | null;
};
type NoteRow = {
  id: string; title: string; content: string; category?: string | null;
  manual_title?: string | null; manual_content?: string | null;
  tags: string[]; manual_tags: string[]; created_at: string;
};
type ProjectRow = {
  id: string; name: string; color: string; type: string;
  client?: string | null; target?: string | null;
  milestones?: Milestone[];
  checklist?: ChecklistItem[];
  activity?: ActivityEntry[];
};
type PersonRow = { id: string; name: string };
type RoutineRow = {
  id: string; title: string; description?: string | null;
  period: string; streak_goal?: number | null; history: string[];
};
type EditableEvent = {
  id: string; title: string; location?: string | null;
  allDay: boolean; start: string; end: string; accountKey: string;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueLabel(due: string): string {
  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA");
  if (due === today) return "Today";
  if (due === tomorrow) return "Tomorrow";
  const d = new Date(due + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapTask(row: TaskRow): Task {
  const today = new Date().toLocaleDateString("en-CA");
  return {
    id: row.id,
    title: row.title,
    starred: row.starred,
    done: row.status !== "open",
    projectId: row.project_id ?? undefined,
    dueDate: row.due ?? undefined,
    dueLabel: row.due ? dueLabel(row.due) : undefined,
    overdue: !!(row.due && row.due < today && row.status === "open"),
    recurring: !!row.recurrence,
  };
}

function mapNote(row: NoteRow): LibraryNote {
  const category = (row.category as LibraryCategory | null) ?? "Notes";
  const allTags = [...new Set([...(row.manual_tags ?? []), ...(row.tags ?? [])])];
  return {
    id: row.id,
    category,
    label: (row.manual_title || row.title).toUpperCase().slice(0, 40),
    date: formatDate(row.created_at),
    body: row.manual_content || row.content || "",
    tags: allTags.length ? allTags : [category.toUpperCase()],
  };
}

function mapProject(row: ProjectRow): Project {
  const type = (row.type === "retainer" || row.type === "area" ? row.type : "active") as ProjectType;
  const group = type === "retainer" ? "Retainers" : type === "area" ? "Areas" : "Active";
  const milestones: Milestone[] = Array.isArray(row.milestones) ? row.milestones : [];
  const checklist: ChecklistItem[] = Array.isArray(row.checklist) ? row.checklist : [];
  const activity: ActivityEntry[] = Array.isArray(row.activity) ? row.activity : [];
  const milestoneDone = milestones.filter((m) => m.done).length;
  const meta = [
    row.client,
    milestones.length ? `${milestoneDone}/${milestones.length} milestones` : null,
    row.target ? `Target ${row.target}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    id: row.id, name: row.name, color: row.color, type, group, meta,
    client: row.client ?? undefined, target: row.target ?? undefined,
    milestones, checklist, activity,
  };
}

function mapRoutine(row: RoutineRow): Routine {
  const todayKey = new Date().toLocaleDateString("en-CA");
  const history: string[] = Array.isArray(row.history) ? row.history : [];
  const doneToday = history.includes(todayKey);
  const streak = history.length;
  return {
    id: row.id, title: row.title,
    description: row.description ?? undefined,
    period: row.period,
    streakGoal: row.streak_goal ?? undefined,
    doneToday, streak,
  };
}

function mapPerson(row: PersonRow): Person {
  return { id: row.id, name: row.name, noteCount: 0 };
}

function mapAgendaEvent(e: EditableEvent): AgendaEvent {
  const start = new Date(e.start);
  const today = new Date();
  const isToday = start.toDateString() === today.toDateString();
  const isTomorrow =
    start.toDateString() === new Date(today.getTime() + 86_400_000).toDateString();
  const day = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : start.toLocaleDateString("en-US", { weekday: "short" });
  const time = e.allDay
    ? "All day"
    : start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { id: e.id, title: e.title, day, time, location: e.location ?? undefined };
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

type AppStateValue = {
  tasks: Task[];
  notes: LibraryNote[];
  projects: Project[];
  people: Person[];
  agenda: AgendaEvent[];
  scrapItems: ScrapItem[];
  routines: Routine[];
  health: HealthData | null;
  healthHistory: HealthHistoryDay[];
  loading: boolean;
  refreshing: boolean;
  refreshAll: () => Promise<void>;
  toggleTaskDone: (id: string) => void;
  toggleTaskStar: (id: string) => void;
  addTask: (title: string, opts?: { starred?: boolean }) => void;
  toggleRoutine: (id: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
  addMilestone: (projectId: string, title: string) => void;
  addChecklistItem: (projectId: string, title: string) => void;
  addProject: (input: { name: string; client?: string; type: ProjectType; color: string }) => string;
  addActivity: (projectId: string, entry: { kind: "work" | "update"; note: string; minutes?: number }) => void;
  healthExpanded: boolean;
  toggleHealthExpanded: () => void;
  categories: string[];
  libFilter: LibraryFilter;
  setLibFilter: (f: LibraryFilter) => void;
  query: string;
  setQuery: (q: string) => void;
  selectedNoteId: string | null;
  openNote: (id: string | null) => void;
  updateNote: (id: string, patch: Partial<LibraryNote>) => void;
  selectedProjectId: string | null;
  openProject: (id: string | null) => void;
  capture: "text" | null;
  draft: string;
  setDraft: (s: string) => void;
  openCapture: () => void;
  closeCapture: () => void;
  submitCapture: (intent?: { type?: string; projectId?: string }) => void;
  deleteNote: (id: string) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  signOut: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function routeCapture(raw: string): { kind: CaptureKind; body: string } {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith("task:") || lower.startsWith("todo:"))
    return { kind: "task", body: text.slice(text.indexOf(":") + 1).trim() };
  if (lower.startsWith("quote:")) return { kind: "quote", body: text.slice(6).trim() };
  if (lower.startsWith("journal:")) return { kind: "journal", body: text.slice(8).trim() };
  if (lower.startsWith("note:")) return { kind: "note", body: text.slice(5).trim() };
  return { kind: "note", body: text };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppStateProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<LibraryNote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [scrapItems, setScrapItems] = useState<ScrapItem[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthHistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [healthExpanded, setHealthExpanded] = useState(false);
  const [libFilter, setLibFilter] = useState<LibraryFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [capture, setCapture] = useState<"text" | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- data loading -------------------------------------------------------

  useEffect(() => {
    void loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    await Promise.allSettled([
      loadTasks(),
      loadNotes(),
      loadProjects(),
      loadPeople(),
      loadAgenda(),
      loadScrapbook(),
      loadRoutines(),
      loadHealth(),
      loadHealthHistory(),
    ]);
    setLoading(false);
  }

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("id,title,starred,status,due,recurrence,project_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTasks((data as TaskRow[]).map(mapTask));
  }

  async function loadNotes() {
    const { data } = await supabase
      .from("library_notes")
      .select("id,title,content,category,manual_title,manual_content,tags,manual_tags,created_at")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (data) setNotes((data as NoteRow[]).map(mapNote));
  }

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id,name,color,type,client,target,milestones,checklist")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setProjects((data as ProjectRow[]).map(mapProject));
  }

  async function loadPeople() {
    const { data } = await supabase
      .from("people")
      .select("id,name")
      .eq("user_id", userId)
      .order("name");
    if (data) setPeople((data as PersonRow[]).map(mapPerson));
  }

  async function loadAgenda() {
    // API_URL is empty now that the app is same-origin with the API; a relative
    // "/api/..." path resolves against the current origin on web. Only bail on
    // native (no origin) when no explicit API_URL is configured.
    if (!API_URL && Platform.OS !== "web") return;
    try {
      const res = await fetch(`${API_URL}/api/calendar/agenda`);
      const json = (await res.json()) as { events?: EditableEvent[] };
      if (json.events?.length) {
        const now = new Date();
        const upcoming = json.events
          .filter((e) => e.allDay || new Date(e.start) >= now)
          .slice(0, 6)
          .map(mapAgendaEvent);
        setAgenda(upcoming);
      }
    } catch {
      // calendar not configured or offline — leave empty
    }
  }

  async function loadScrapbook() {
    if (!API_URL && Platform.OS !== "web") return;
    try {
      const res = await fetch(`${API_URL}/api/scrapbook`, { headers: scrapHeaders() });
      const json = (await res.json()) as { items?: ScrapItem[] };
      if (json.items?.length) setScrapItems(json.items);
    } catch {
      // offline — leave empty
    }
  }

  async function loadRoutines() {
    const { data } = await supabase
      .from("routines")
      .select("id,title,description,period,streak_goal,history")
      .eq("user_id", userId)
      .order("created_at");
    if (data) setRoutines((data as RoutineRow[]).map(mapRoutine));
  }

  async function loadHealth() {
    if (!API_URL && Platform.OS !== "web") return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`${API_URL}/api/health/snapshot?timezone=${encodeURIComponent(tz)}`);
      const json = (await res.json()) as {
        configured?: boolean;
        snapshot?: {
          sleep?: {
            hours: number; start?: string; end?: string;
            efficiency?: number; minutesToFallAsleep?: number; minutesAwake?: number;
            stages?: { deepMinutes?: number; lightMinutes?: number; remMinutes?: number; awakeMinutes?: number };
          };
          restingHeartRate?: number;
          steps?: number;
          nutrition?: { calories?: number; proteinGrams?: number; carbsGrams?: number; fatGrams?: number };
        };
      };
      if (json.snapshot) {
        const s = json.snapshot;
        setHealth({
          sleepHours: s.sleep?.hours,
          sleepStart: s.sleep?.start,
          sleepEnd: s.sleep?.end,
          efficiency: s.sleep?.efficiency,
          minutesToFallAsleep: s.sleep?.minutesToFallAsleep,
          minutesAwake: s.sleep?.minutesAwake,
          deepMinutes: s.sleep?.stages?.deepMinutes,
          lightMinutes: s.sleep?.stages?.lightMinutes,
          remMinutes: s.sleep?.stages?.remMinutes,
          awakeMinutes: s.sleep?.stages?.awakeMinutes,
          restingHR: s.restingHeartRate,
          steps: s.steps,
          calories: s.nutrition?.calories,
          protein: s.nutrition?.proteinGrams,
          carbs: s.nutrition?.carbsGrams,
          fat: s.nutrition?.fatGrams,
        });
      }
    } catch {
      // offline or not configured — leave null
    }
  }

  async function loadHealthHistory() {
    if (!API_URL && Platform.OS !== "web") return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API_URL}/api/health/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const json = (await res.json()) as { days?: HealthHistoryDay[] };
      if (Array.isArray(json.days)) setHealthHistory(json.days);
    } catch {
      // offline or unauthorized — leave empty
    }
  }

  // Create a task directly (used by the Today page's inline "add a top task"
  // slot). starred=true makes it show in Top 3.
  const addTask = useCallback((title: string, opts?: { starred?: boolean }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = `t${Date.now()}`;
    const starred = opts?.starred ?? false;
    setTasks((prev) => [{ id, title: trimmed, done: false, starred }, ...prev]);
    void supabase.from("tasks").insert({
      id, title: trimmed, status: "open", starred, user_id: userId,
    });
  }, [userId]);

  // Re-pull everything without clearing the screen (used by the manual Sync
  // button and by the foreground refetch below).
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      loadTasks(),
      loadNotes(),
      loadProjects(),
      loadPeople(),
      loadAgenda(),
      loadScrapbook(),
      loadRoutines(),
      loadHealth(),
      loadHealthHistory(),
    ]);
    setRefreshing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // When the app returns to the foreground (e.g. reopening the installed PWA
  // from the home screen), silently re-pull the live data — health/steps and
  // calendar would otherwise stay frozen at whatever they were when it opened.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (state) => {
      if (state === "active") {
        void loadHealth();
        void loadAgenda();
        void loadTasks();
        void loadProjects();
        void loadNotes();
        void loadRoutines();
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---- mutations ----------------------------------------------------------

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const toggleTaskDone = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const newDone = !task.done;
      void supabase
        .from("tasks")
        .update({ status: newDone ? "done" : "open", completed_at: newDone ? new Date().toISOString() : null })
        .eq("id", id);
      return prev.map((t) => (t.id === id ? { ...t, done: newDone } : t));
    });
  }, []);

  const toggleTaskStar = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const newStarred = !task.starred;
      void supabase.from("tasks").update({ starred: newStarred }).eq("id", id);
      return prev.map((t) => (t.id === id ? { ...t, starred: newStarred } : t));
    });
  }, []);

  const toggleRoutine = useCallback((id: string) => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, doneToday: !r.doneToday } : r)));
    void (async () => {
      const { data } = await supabase.from("routines").select("history").eq("id", id).single();
      if (!data) return;
      const history: string[] = Array.isArray(data.history) ? data.history : [];
      const newHistory = history.includes(todayKey)
        ? history.filter((d) => d !== todayKey)
        : [...history, todayKey];
      await supabase.from("routines").update({ history: newHistory }).eq("id", id);
    })();
  }, []);

  // Flip a milestone/checklist item's done state locally, then persist the whole
  // updated array to the project's jsonb column so the web app (same table) sees it.
  const persistProjectField = useCallback(
    (projectId: string, field: "milestones" | "checklist", value: Milestone[] | ChecklistItem[]) => {
      void supabase
        .from("projects")
        .update({ [field]: value })
        .eq("id", projectId)
        .then(({ error }) => {
          if (error) {
            console.error(`Failed to save project ${field}`, error);
            showToast("Couldn't save — check your connection");
            void loadProjects();
          }
        });
    },
    [showToast],
  );

  const toggleMilestone = useCallback((projectId: string, milestoneId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const milestones = p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m,
        );
        persistProjectField(projectId, "milestones", milestones);
        return { ...p, milestones };
      }),
    );
  }, [persistProjectField]);

  const toggleChecklistItem = useCallback((projectId: string, itemId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const checklist = p.checklist.map((c) =>
          c.id === itemId ? { ...c, done: !c.done } : c,
        );
        persistProjectField(projectId, "checklist", checklist);
        return { ...p, checklist };
      }),
    );
  }, [persistProjectField]);

  const addMilestone = useCallback((projectId: string, title: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const milestones = [...p.milestones, { id: `m${Date.now()}`, title, weight: 10, done: false }];
        persistProjectField(projectId, "milestones", milestones);
        return { ...p, milestones };
      }),
    );
  }, [persistProjectField]);

  const addChecklistItem = useCallback((projectId: string, title: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const checklist = [...p.checklist, { id: `c${Date.now()}`, title, recurrence: "one-shot", done: false }];
        persistProjectField(projectId, "checklist", checklist);
        return { ...p, checklist };
      }),
    );
  }, [persistProjectField]);

  const addProject = useCallback(
    (input: { name: string; client?: string; type: ProjectType; color: string }) => {
      const id = `proj_${Date.now().toString(36)}`;
      const group = input.type === "retainer" ? "Retainers" : input.type === "area" ? "Areas" : "Active";
      const project: Project = {
        id, name: input.name.trim(), color: input.color, type: input.type, group,
        meta: input.client ?? "",
        client: input.client || undefined,
        milestones: [], checklist: [], activity: [],
      };
      setProjects((prev) => [project, ...prev]);
      void supabase
        .from("projects")
        .insert({
          id, user_id: userId, name: project.name, client: input.client ?? null,
          color: input.color, type: input.type, target: null,
          milestones: [], checklist: [], activity: [],
        })
        .then(({ error }) => {
          if (error) {
            console.error("Failed to create project", error);
            showToast("Couldn't create project");
          }
        });
      return id;
    },
    [userId, showToast],
  );

  const addActivity = useCallback(
    (projectId: string, entry: { kind: "work" | "update"; note: string; minutes?: number }) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const activity = [
            { id: `a${Date.now()}`, kind: entry.kind, note: entry.note, minutes: entry.minutes, at: new Date().toISOString() },
            ...p.activity,
          ];
          void supabase
            .from("projects")
            .update({ activity })
            .eq("id", projectId)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to log activity", error);
                showToast("Couldn't save — check your connection");
                void loadProjects();
              }
            });
          return { ...p, activity };
        }),
      );
    },
    [showToast],
  );

  const toggleHealthExpanded = useCallback(() => setHealthExpanded((v) => !v), []);
  const openNote = useCallback((id: string | null) => setSelectedNoteId(id), []);
  const openProject = useCallback((id: string | null) => setSelectedProjectId(id), []);

  const updateNote = useCallback((id: string, patch: Partial<LibraryNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const dbPatch: Record<string, unknown> = {};
    if (patch.body !== undefined) dbPatch.manual_content = patch.body;
    if (patch.label !== undefined) dbPatch.manual_title = patch.label;
    if (Object.keys(dbPatch).length) {
      void supabase.from("library_notes").update(dbPatch).eq("id", id);
    }
  }, []);

  const openCapture = useCallback(() => {
    setCapture("text");
  }, []);

  const closeCapture = useCallback(() => {
    setCapture(null);
    setDraft("");
  }, []);

  const submitCapture = useCallback((intent?: { type?: string; projectId?: string }) => {
    if (!draft.trim()) return;

    // An explicit type from the capture chips wins; otherwise fall back to
    // parsing a "task:/quote:/journal:/note:" prefix out of the text.
    let kind: string;
    let body: string;
    if (intent?.type) {
      kind = intent.type.toLowerCase();
      body = draft.trim();
    } else {
      const routed = routeCapture(draft);
      kind = routed.kind;
      body = routed.body;
    }

    if (kind === "task") {
      const id = `t${Date.now()}`;
      const project = intent?.projectId
        ? projects.find((p) => p.id === intent.projectId)
        : undefined;
      const newTask: Task = {
        id, title: body, done: false, starred: false,
        projectId: project?.id,
        projectName: project?.name,
        projectColor: project?.color,
      };
      setTasks((prev) => [newTask, ...prev]);
      void supabase.from("tasks").insert({
        id, title: body, status: "open", starred: false,
        project_id: project?.id ?? null, user_id: userId,
      });
      showToast(project ? `Added to Tasks · ${project.name}` : "Added to Tasks");
    } else {
      const id = `n${Date.now()}`;
      // Known note kinds map to their category; anything else is a folder name.
      const category: LibraryCategory =
        kind === "quote" ? "Quotes"
        : kind === "journal" ? "Journal"
        : kind === "note" ? "Notes"
        : ((intent?.type ?? "Notes") as LibraryCategory);
      const tag = category.toUpperCase().replace(/\s+/g, "_");
      const newNote: LibraryNote = {
        id, category, label: category.toUpperCase(),
        date: todayStr(), body,
        tags: [tag],
      };
      setNotes((prev) => [newNote, ...prev]);
      void supabase.from("library_notes").insert({
        id, path: `capture/${id}`, title: body.slice(0, 80),
        content: body, category, tags: [tag], manual_tags: [], user_id: userId,
      });
      showToast(`Added to Library · ${category}`);
    }
    closeCapture();
  }, [draft, userId, projects, closeCapture, showToast]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    void supabase
      .from("library_notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ---- context value ------------------------------------------------------

  const categories = useMemo(
    () => [...new Set(notes.map((n) => n.category).filter(Boolean))].sort() as string[],
    [notes],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      tasks, notes, projects, people, agenda, scrapItems, routines, health, healthHistory, loading,
      refreshing, refreshAll,
      toggleTaskDone, toggleTaskStar, addTask, toggleRoutine, toggleMilestone, toggleChecklistItem, addMilestone, addChecklistItem, addProject, addActivity,
      healthExpanded, toggleHealthExpanded,
      categories,
      libFilter, setLibFilter,
      query, setQuery,
      selectedNoteId, openNote, updateNote,
      selectedProjectId, openProject,
      capture, draft, setDraft, openCapture, closeCapture, submitCapture,
      deleteNote,
      toast, showToast,
      signOut,
    }),
    [
      tasks, notes, projects, people, agenda, scrapItems, routines, health, healthHistory, loading,
      refreshing, refreshAll,
      toggleTaskDone, toggleTaskStar, addTask, toggleRoutine, toggleMilestone, toggleChecklistItem, addMilestone, addChecklistItem, addProject, addActivity,
      healthExpanded, toggleHealthExpanded,
      categories,
      libFilter, query,
      selectedNoteId, openNote, updateNote,
      selectedProjectId, openProject,
      capture, draft, openCapture, closeCapture, submitCapture,
      deleteNote,
      toast, showToast,
      signOut,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
