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
import type { LibraryNote } from "@/lib/library";

type LibraryNoteRow = {
  id: string;
  user_id: string;
  path: string;
  title: string;
  content: string;
  manual_title: string | null;
  manual_content: string | null;
  tags: string[];
  manual_tags: string[];
  category: string | null;
  person_ids: string[];
  source_modified_at: string | null;
  synced_at: string;
  created_at: string;
};

function fromRow(row: LibraryNoteRow): LibraryNote {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    manualTitle: row.manual_title ?? undefined,
    manualContent: row.manual_content ?? undefined,
    tags: row.tags ?? [],
    manualTags: row.manual_tags ?? [],
    category: row.category ?? undefined,
    personIds: row.person_ids ?? [],
    sourceModifiedAt: row.source_modified_at ?? undefined,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  };
}

export type SyncNoteInput = {
  path: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  personIds: string[];
  sourceModifiedAt: string;
};

export type SyncSummary = { created: number; updated: number };

type LibraryStore = {
  notes: LibraryNote[];
  hydrated: boolean;
  deleteNote: (id: string) => void;
  /** Upserts a batch of parsed notes by vault path: existing paths are
   *  updated in place, new paths are inserted. Never touches manualTags. */
  syncNotes: (notes: SyncNoteInput[]) => Promise<SyncSummary>;
  /** Edits a note's title/body in the app. Stored separately from the
   *  synced title/content, so it survives re-syncing — but it is one-way:
   *  the edit is not written back to the Obsidian file. */
  editNote: (noteId: string, title: string, content: string) => void;
  addManualTag: (noteId: string, tag: string) => void;
  removeManualTag: (noteId: string, tag: string) => void;
};

const LibraryContext = createContext<LibraryStore | null>(null);

function makeId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const SYNC_BATCH_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function LibraryStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LibraryNote[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load this user's notes from Supabase, then subscribe to row changes so
  // edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("library_notes")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load library notes", error);
        } else if (data) {
          setNotes((data as LibraryNoteRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`library_notes:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "library_notes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setNotes((prev) => prev.filter((n) => n.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as LibraryNoteRow);
          setNotes((prev) => {
            const idx = prev.findIndex((n) => n.id === next.id);
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

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (!user) return;
      supabase
        .from("library_notes")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete note", error);
        });
    },
    [user],
  );

  const syncNotes = useCallback(
    async (input: SyncNoteInput[]) => {
      if (!user || input.length === 0) return { created: 0, updated: 0 };

      const pathToId = new Map(notesRef.current.map((n) => [n.path, n.id]));
      const now = new Date().toISOString();
      let created = 0;
      let updated = 0;

      const rows = input.map((n) => {
        const existingId = pathToId.get(n.path);
        if (existingId) updated += 1;
        else created += 1;
        return {
          id: existingId ?? makeId(),
          user_id: user.id,
          path: n.path,
          title: n.title,
          content: n.content,
          tags: n.tags,
          category: n.category ?? null,
          person_ids: n.personIds,
          source_modified_at: n.sourceModifiedAt,
          synced_at: now,
        };
      });

      // manual_tags is deliberately omitted: Postgres leaves it untouched on
      // conflict, so tags added in the app survive re-syncing the same note.
      for (const batch of chunk(rows, SYNC_BATCH_SIZE)) {
        const { error } = await supabase
          .from("library_notes")
          .upsert(batch, { onConflict: "user_id,path" });
        if (error) {
          console.error("Failed to sync notes", error);
          throw error;
        }
      }

      setNotes((prev) => {
        const byId = new Map(prev.map((n) => [n.id, n]));
        for (const row of rows) {
          const existing = byId.get(row.id);
          byId.set(row.id, {
            id: row.id,
            path: row.path,
            title: row.title,
            content: row.content,
            manualTitle: existing?.manualTitle,
            manualContent: existing?.manualContent,
            tags: row.tags,
            manualTags: existing?.manualTags ?? [],
            category: row.category ?? undefined,
            personIds: row.person_ids,
            sourceModifiedAt: row.source_modified_at,
            syncedAt: row.synced_at,
            createdAt: existing?.createdAt ?? now,
          });
        }
        return Array.from(byId.values());
      });

      return { created, updated };
    },
    [user],
  );

  const editNote = useCallback(
    (noteId: string, title: string, content: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, manualTitle: title, manualContent: content }
            : n,
        ),
      );
      if (!user) return;
      supabase
        .from("library_notes")
        .update({ manual_title: title, manual_content: content })
        .eq("id", noteId)
        .then(({ error }) => {
          if (error) console.error("Failed to edit note", error);
        });
    },
    [user],
  );

  const setManualTags = useCallback(
    (noteId: string, tags: string[]) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, manualTags: tags } : n)),
      );
      if (!user) return;
      supabase
        .from("library_notes")
        .update({ manual_tags: tags })
        .eq("id", noteId)
        .then(({ error }) => {
          if (error) console.error("Failed to update tags", error);
        });
    },
    [user],
  );

  const addManualTag = useCallback(
    (noteId: string, tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note || note.manualTags.includes(trimmed)) return;
      setManualTags(noteId, [...note.manualTags, trimmed]);
    },
    [setManualTags],
  );

  const removeManualTag = useCallback(
    (noteId: string, tag: string) => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return;
      setManualTags(
        noteId,
        note.manualTags.filter((t) => t !== tag),
      );
    },
    [setManualTags],
  );

  return (
    <LibraryContext.Provider
      value={{
        notes,
        hydrated,
        deleteNote,
        syncNotes,
        editNote,
        addManualTag,
        removeManualTag,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within a LibraryStoreProvider");
  }
  return ctx;
}
