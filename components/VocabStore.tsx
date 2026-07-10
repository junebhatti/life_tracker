"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import type { PartOfSpeech, VocabWord } from "@/lib/vocab";

type VocabWordRow = {
  id: string;
  user_id: string;
  word: string;
  definition: string | null;
  pos: string | null;
  example: string | null;
  synonyms: string[] | null;
  created_at: string;
};

function fromRow(row: VocabWordRow): VocabWord {
  return {
    id: row.id,
    word: row.word,
    definition: row.definition ?? undefined,
    pos: (row.pos as PartOfSpeech | null) ?? undefined,
    example: row.example ?? undefined,
    synonyms: row.synonyms && row.synonyms.length ? row.synonyms : undefined,
    createdAt: row.created_at,
  };
}

export type VocabWordPatch = {
  word?: string;
  definition?: string;
  pos?: PartOfSpeech;
  example?: string;
  synonyms?: string[];
};

type VocabStore = {
  words: VocabWord[];
  hydrated: boolean;
  addWord: (input: { word: string; definition?: string; pos?: PartOfSpeech }) => void;
  updateWord: (id: string, patch: VocabWordPatch) => void;
  deleteWord: (id: string) => void;
};

const VocabContext = createContext<VocabStore | null>(null);

function makeId() {
  return `vocab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function VocabStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load this user's words from Supabase, then subscribe to row changes so
  // edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWords([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("vocab_words")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load vocab words", error);
        } else if (data) {
          setWords((data as VocabWordRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`vocab_words:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vocab_words",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setWords((prev) => prev.filter((w) => w.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as VocabWordRow);
          setWords((prev) => {
            const idx = prev.findIndex((w) => w.id === next.id);
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

  const addWord = useCallback(
    (input: { word: string; definition?: string; pos?: PartOfSpeech }) => {
      const trimmed = input.word.trim();
      if (!trimmed) return;
      const entry: VocabWord = {
        id: makeId(),
        word: trimmed,
        definition: input.definition?.trim() || undefined,
        pos: input.pos,
        createdAt: new Date().toISOString(),
      };
      setWords((prev) => [...prev, entry]);
      if (user) {
        supabase
          .from("vocab_words")
          .insert({
            id: entry.id,
            user_id: user.id,
            word: entry.word,
            definition: entry.definition ?? null,
            pos: entry.pos ?? null,
            created_at: entry.createdAt,
          })
          .then(({ error }) => {
            if (error) console.error("Failed to save vocab word", error);
          });
      }
    },
    [user],
  );

  const updateWord = useCallback(
    (id: string, patch: VocabWordPatch) => {
      setWords((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                word: patch.word !== undefined ? patch.word.trim() || w.word : w.word,
                definition: patch.definition !== undefined ? patch.definition.trim() || undefined : w.definition,
                pos: patch.pos !== undefined ? patch.pos : w.pos,
                example: patch.example !== undefined ? patch.example.trim() || undefined : w.example,
                synonyms: patch.synonyms !== undefined ? patch.synonyms : w.synonyms,
              }
            : w,
        ),
      );
      if (!user) return;
      const db: Record<string, unknown> = {};
      if (patch.word !== undefined) db.word = patch.word.trim();
      if (patch.definition !== undefined) db.definition = patch.definition.trim() || null;
      if (patch.pos !== undefined) db.pos = patch.pos;
      if (patch.example !== undefined) db.example = patch.example.trim() || null;
      if (patch.synonyms !== undefined) db.synonyms = patch.synonyms;
      if (Object.keys(db).length === 0) return;
      supabase
        .from("vocab_words")
        .update(db)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to update vocab word", error);
        });
    },
    [user],
  );

  const deleteWord = useCallback(
    (id: string) => {
      setWords((prev) => prev.filter((w) => w.id !== id));
      if (!user) return;
      supabase
        .from("vocab_words")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete vocab word", error);
        });
    },
    [user],
  );

  return (
    <VocabContext.Provider value={{ words, hydrated, addWord, updateWord, deleteWord }}>
      {children}
    </VocabContext.Provider>
  );
}

export function useVocab() {
  const ctx = useContext(VocabContext);
  if (!ctx) {
    throw new Error("useVocab must be used within a VocabStoreProvider");
  }
  return ctx;
}
