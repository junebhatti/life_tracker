import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedAgenda, seedNotes, seedPeople, seedProjects, seedScrapItems, seedTasks } from "../data/seed";
import type {
  AgendaEvent,
  CaptureKind,
  LibraryFilter,
  LibraryNote,
  Person,
  Project,
  ScrapItem,
  Task,
} from "../types";

const DEMO_TRANSCRIPT =
  "Quick note to self — remember to follow up on the Fetter Pools report and grab groceries on the way home.";

type AppStateValue = {
  tasks: Task[];
  notes: LibraryNote[];
  projects: Project[];
  people: Person[];
  agenda: AgendaEvent[];
  scrapItems: ScrapItem[];
  toggleTaskDone: (id: string) => void;
  toggleTaskStar: (id: string) => void;

  healthExpanded: boolean;
  toggleHealthExpanded: () => void;

  libFilter: LibraryFilter;
  setLibFilter: (f: LibraryFilter) => void;

  query: string;
  setQuery: (q: string) => void;

  selectedNoteId: string | null;
  openNote: (id: string | null) => void;
  updateNote: (id: string, patch: Partial<LibraryNote>) => void;

  capture: "text" | "voice" | null;
  draft: string;
  setDraft: (s: string) => void;
  openCapture: (kind: "text" | "voice") => void;
  closeCapture: () => void;
  submitCapture: () => void;

  voiceText: string;
  seconds: number;
  stopVoice: () => void;

  toast: string | null;
  showToast: (msg: string) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function routeCapture(raw: string): { kind: CaptureKind; body: string } {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith("task:") || lower.startsWith("todo:")) {
    return { kind: "task", body: text.slice(text.indexOf(":") + 1).trim() };
  }
  if (lower.startsWith("quote:")) return { kind: "quote", body: text.slice(6).trim() };
  if (lower.startsWith("journal:")) return { kind: "journal", body: text.slice(8).trim() };
  if (lower.startsWith("note:")) return { kind: "note", body: text.slice(5).trim() };
  return { kind: "note", body: text };
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [notes, setNotes] = useState<LibraryNote[]>(seedNotes);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [libFilter, setLibFilter] = useState<LibraryFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [capture, setCapture] = useState<"text" | "voice" | null>(null);
  const [draft, setDraft] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptIndex = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const toggleTaskDone = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const toggleTaskStar = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)));
  }, []);

  const toggleHealthExpanded = useCallback(() => setHealthExpanded((v) => !v), []);

  const openNote = useCallback((id: string | null) => setSelectedNoteId(id), []);
  const updateNote = useCallback((id: string, patch: Partial<LibraryNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const openCapture = useCallback(
    (kind: "text" | "voice") => {
      setCapture(kind);
      if (kind === "voice") {
        setSeconds(0);
        setVoiceText("");
        transcriptIndex.current = 0;
        const words = DEMO_TRANSCRIPT.split(" ");
        voiceTimer.current = setInterval(() => {
          setSeconds((s) => s + 1);
          transcriptIndex.current = Math.min(transcriptIndex.current + 2, words.length);
          setVoiceText(words.slice(0, transcriptIndex.current).join(" "));
        }, 1000);
      }
    },
    [],
  );

  const closeCapture = useCallback(() => {
    setCapture(null);
    setDraft("");
    if (voiceTimer.current) {
      clearInterval(voiceTimer.current);
      voiceTimer.current = null;
    }
  }, []);

  const submitCapture = useCallback(() => {
    if (!draft.trim()) return;
    const { kind, body } = routeCapture(draft);
    if (kind === "task") {
      setTasks((prev) => [
        { id: `t${Date.now()}`, title: body, done: false, starred: false },
        ...prev,
      ]);
      showToast("Added to Tasks");
    } else {
      const category = kind === "quote" ? "Quotes" : kind === "journal" ? "Journal" : "Notes";
      setNotes((prev) => [
        {
          id: `n${Date.now()}`,
          category,
          label: category.toUpperCase(),
          date: today(),
          body,
          tags: category === "Journal" ? ["JOURNAL", "PERSONAL"] : [category.toUpperCase()],
        },
        ...prev,
      ]);
      showToast(`Added to Library · ${category}`);
    }
    closeCapture();
  }, [draft, closeCapture, showToast]);

  const stopVoice = useCallback(() => {
    if (voiceTimer.current) {
      clearInterval(voiceTimer.current);
      voiceTimer.current = null;
    }
    const finalText = voiceText || DEMO_TRANSCRIPT;
    setNotes((prev) => [
      {
        id: `n${Date.now()}`,
        category: "Journal",
        label: "JOURNAL",
        sub: "VIA VOICE",
        date: today(),
        body: finalText,
        tags: ["JOURNAL", "PERSONAL", "VOICE"],
      },
      ...prev,
    ]);
    setCapture(null);
    setVoiceText("");
    setSeconds(0);
    showToast("Saved to Journal");
  }, [voiceText, showToast]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (voiceTimer.current) clearInterval(voiceTimer.current);
    };
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      tasks,
      notes,
      projects: seedProjects,
      people: seedPeople,
      agenda: seedAgenda,
      scrapItems: seedScrapItems,
      toggleTaskDone,
      toggleTaskStar,
      healthExpanded,
      toggleHealthExpanded,
      libFilter,
      setLibFilter,
      query,
      setQuery,
      selectedNoteId,
      openNote,
      updateNote,
      capture,
      draft,
      setDraft,
      openCapture,
      closeCapture,
      submitCapture,
      voiceText,
      seconds,
      stopVoice,
      toast,
      showToast,
    }),
    [
      tasks,
      notes,
      toggleTaskDone,
      toggleTaskStar,
      healthExpanded,
      toggleHealthExpanded,
      libFilter,
      query,
      selectedNoteId,
      openNote,
      updateNote,
      capture,
      draft,
      openCapture,
      closeCapture,
      submitCapture,
      voiceText,
      seconds,
      stopVoice,
      toast,
      showToast,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
