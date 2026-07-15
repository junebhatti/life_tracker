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
  clampMilestoneWeight,
  type ActivityKind,
  type ChecklistRecurrence,
  type NewProjectInput,
  type Project,
  type ProjectType,
} from "@/lib/projects";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  color: string;
  type: string;
  target: string | null;
  milestones: Project["milestones"];
  checklist: Project["checklist"];
  activity: Project["activity"];
  created_at: string;
};

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client ?? undefined,
    color: row.color,
    type: row.type as ProjectType,
    target: row.target ?? undefined,
    milestones: row.milestones ?? [],
    checklist: row.checklist ?? [],
    activity: row.activity ?? [],
    createdAt: row.created_at,
  };
}

function toRow(project: Project, userId: string): ProjectRow {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    client: project.client ?? null,
    color: project.color,
    type: project.type,
    target: project.target ?? null,
    milestones: project.milestones,
    checklist: project.checklist,
    activity: project.activity,
    created_at: project.createdAt,
  };
}

type ProjectStore = {
  projects: Project[];
  hydrated: boolean;
  /** Re-fetch projects from Supabase (used when opening a detail page so it's
   *  never stale, even if a realtime event was missed). */
  refresh: () => void;
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
  updateActivity: (
    projectId: string,
    activityId: string,
    patch: { note?: string; minutes?: number },
  ) => void;
  deleteActivity: (projectId: string, activityId: string) => void;
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
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Re-fetch all projects for the current user. Exposed so a detail page can
  // pull fresh data on open, covering the case where a realtime event was
  // missed (long-open tab, Realtime disabled, another device).
  const refresh = useCallback(() => {
    const uid = user?.id;
    if (!uid) return;
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", uid)
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load projects", error);
        } else if (data) {
          setProjects((data as ProjectRow[]).map(fromRow));
        }
      });
  }, [user?.id]);

  // Load this user's projects from Supabase, then subscribe to row changes
  // so edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjects([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load projects", error);
        } else if (data) {
          setProjects((data as ProjectRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`projects:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setProjects((prev) => prev.filter((p) => p.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as ProjectRow);
          setProjects((prev) => {
            const idx = prev.findIndex((p) => p.id === next.id);
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

  const persist = useCallback(
    (project: Project) => {
      if (!user) return;
      supabase
        .from("projects")
        .update(toRow(project, user.id))
        .eq("id", project.id)
        .then(({ error }) => {
          if (error) console.error("Failed to save project", error);
        });
    },
    [user],
  );

  /** Apply a transform to one project by id, locally and in Supabase. */
  const patchProject = useCallback(
    (id: string, fn: (p: Project) => Project) => {
      let updated: Project | undefined;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          updated = fn(p);
          return updated;
        }),
      );
      if (updated) persist(updated);
    },
    [persist],
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const addProject = useCallback(
    (input: NewProjectInput) => {
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
      if (user) {
        supabase
          .from("projects")
          .insert(toRow(project, user.id))
          .then(({ error }) => {
            if (error) console.error("Failed to save project", error);
          });
      }
      return id;
    },
    [user],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      patchProject(id, (p) => ({ ...p, ...patch }));
    },
    [patchProject],
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (!user) return;
      supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete project", error);
        });
    },
    [user],
  );

  const addMilestone = useCallback(
    (projectId: string, title: string, weight: number) => {
      patchProject(projectId, (p) => ({
        ...p,
        milestones: [
          ...p.milestones,
          {
            id: makeId("m"),
            title: title.trim(),
            weight: clampMilestoneWeight(weight),
            done: false,
          },
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
      const clamped =
        patch.weight !== undefined
          ? { ...patch, weight: clampMilestoneWeight(patch.weight) }
          : patch;
      patchProject(projectId, (p) => ({
        ...p,
        milestones: p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, ...clamped } : m,
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

  const updateActivity = useCallback(
    (projectId: string, activityId: string, patch: { note?: string; minutes?: number }) => {
      patchProject(projectId, (p) => ({
        ...p,
        activity: p.activity.map((a) =>
          a.id === activityId
            ? {
                ...a,
                note: patch.note !== undefined ? patch.note.trim() : a.note,
                minutes: patch.minutes !== undefined ? patch.minutes : a.minutes,
              }
            : a,
        ),
      }));
    },
    [patchProject],
  );

  const deleteActivity = useCallback(
    (projectId: string, activityId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        activity: p.activity.filter((a) => a.id !== activityId),
      }));
    },
    [patchProject],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        hydrated,
        refresh,
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
        updateActivity,
        deleteActivity,
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
