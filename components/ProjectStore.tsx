"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  seedProjects,
  type ActivityKind,
  type ChecklistRecurrence,
  type NewProjectInput,
  type Project,
} from "@/lib/projects";

const STORAGE_KEY = "life-tracker:projects:v1";

type ProjectStore = {
  projects: Project[];
  hydrated: boolean;
  getProject: (id: string) => Project | undefined;
  addProject: (input: NewProjectInput) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Milestones
  addMilestone: (projectId: string, title: string, weight: number) => void;
  updateMilestone: (
    projectId: string,
    milestoneId: string,
    patch: { title?: string; weight?: number },
  ) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  // Checklist
  addChecklistItem: (
    projectId: string,
    title: string,
    recurrence: ChecklistRecurrence,
  ) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
  deleteChecklistItem: (projectId: string, itemId: string) => void;
  // Activity
  addActivity: (
    projectId: string,
    entry: { kind: ActivityKind; note: string; minutes?: number; at?: string },
  ) => void;
};

const ProjectContext = createContext<ProjectStore | null>(null);

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ProjectStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>(() => seedProjects());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setProjects(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [projects, hydrated]);

  /** Apply a transform to one project by id. */
  const patchProject = useCallback(
    (id: string, fn: (p: Project) => Project) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
    },
    [],
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const addProject = useCallback((input: NewProjectInput) => {
    const id = makeId("proj");
    const project: Project = {
      id,
      name: input.name.trim(),
      client: input.client?.trim() || undefined,
      color: input.color ?? "#6b7280",
      type: input.type ?? "active",
      target: input.target || undefined,
      milestones: [],
      checklist: [],
      activity: [],
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, project]);
    return id;
  }, []);

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      patchProject(id, (p) => ({ ...p, ...patch }));
    },
    [patchProject],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addMilestone = useCallback(
    (projectId: string, title: string, weight: number) => {
      patchProject(projectId, (p) => ({
        ...p,
        milestones: [
          ...p.milestones,
          { id: makeId("m"), title: title.trim(), weight, done: false },
        ],
      }));
    },
    [patchProject],
  );

  const updateMilestone = useCallback(
    (
      projectId: string,
      milestoneId: string,
      patch: { title?: string; weight?: number },
    ) => {
      patchProject(projectId, (p) => ({
        ...p,
        milestones: p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, ...patch } : m,
        ),
      }));
    },
    [patchProject],
  );

  const toggleMilestone = useCallback(
    (projectId: string, milestoneId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        milestones: p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m,
        ),
      }));
    },
    [patchProject],
  );

  const deleteMilestone = useCallback(
    (projectId: string, milestoneId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        milestones: p.milestones.filter((m) => m.id !== milestoneId),
      }));
    },
    [patchProject],
  );

  const addChecklistItem = useCallback(
    (projectId: string, title: string, recurrence: ChecklistRecurrence) => {
      patchProject(projectId, (p) => ({
        ...p,
        checklist: [
          ...p.checklist,
          { id: makeId("c"), title: title.trim(), recurrence, done: false },
        ],
      }));
    },
    [patchProject],
  );

  const toggleChecklistItem = useCallback(
    (projectId: string, itemId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        checklist: p.checklist.map((c) =>
          c.id === itemId ? { ...c, done: !c.done } : c,
        ),
      }));
    },
    [patchProject],
  );

  const deleteChecklistItem = useCallback(
    (projectId: string, itemId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        checklist: p.checklist.filter((c) => c.id !== itemId),
      }));
    },
    [patchProject],
  );

  const addActivity = useCallback(
    (
      projectId: string,
      entry: { kind: ActivityKind; note: string; minutes?: number; at?: string },
    ) => {
      patchProject(projectId, (p) => ({
        ...p,
        activity: [
          {
            id: makeId("a"),
            kind: entry.kind,
            note: entry.note.trim(),
            minutes: entry.minutes,
            at: entry.at ?? new Date().toISOString(),
          },
          ...p.activity,
        ],
      }));
    },
    [patchProject],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        hydrated,
        getProject,
        addProject,
        updateProject,
        deleteProject,
        addMilestone,
        updateMilestone,
        toggleMilestone,
        deleteMilestone,
        addChecklistItem,
        toggleChecklistItem,
        deleteChecklistItem,
        addActivity,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjects must be used within a ProjectStoreProvider");
  }
  return ctx;
}
