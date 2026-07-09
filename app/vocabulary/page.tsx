"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useVocab } from "@/components/VocabStore";
import { sortWordsAlphabetically, type VocabWord } from "@/lib/vocab";

export default function VocabularyPage() {
  const { words, hydrated, addWord, updateWord, deleteWord } = useVocab();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");

  const sorted = useMemo(() => sortWordsAlphabetically(words), [words]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (w) => w.word.toLowerCase().includes(q) || (w.definition ?? "").toLowerCase().includes(q),
    );
  }, [sorted, search]);

  const active = activeId ? words.find((w) => w.id === activeId) ?? null : null;

  function submitNewWord() {
    if (!newWord.trim()) return;
    addWord(newWord, newDefinition);
    setNewWord("");
    setNewDefinition("");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <Link
            href="/projects"
            className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            ← Projects
          </Link>

          <div className="mt-4 flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">English Vocabulary</h1>
            <span className="text-lg text-muted">/{words.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Words collected while reading. Click a word for its definition — tap Edit to fill one in.
          </p>

          {/* Quick add */}
          <div className="mt-6 flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewWord()}
              placeholder="Add a word…"
              className="w-40 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            />
            <input
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewWord()}
              placeholder="Definition (optional)"
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            />
            <button
              type="button"
              onClick={submitNewWord}
              disabled={!newWord.trim()}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
            >
              Add
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words or definitions…"
            className="mt-4 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          />

          {!hydrated && (
            <div className="mt-6 flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 w-full animate-pulse rounded bg-hover" />
              ))}
            </div>
          )}

          {hydrated && filtered.length === 0 && (
            <p className="mt-8 text-sm text-muted">
              {words.length === 0 ? "No words yet — add one above." : "No words match your search."}
            </p>
          )}

          {hydrated && filtered.length > 0 && (
            <div className="mt-6">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setActiveId(w.id)}
                  className="flex w-full items-baseline justify-between border-b border-border py-2.5 text-left transition-colors hover:bg-hover"
                >
                  <span className="text-lg text-foreground">{w.word}</span>
                  {!w.definition && (
                    <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">
                      no definition
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {active && (
        <DefinitionModal
          word={active}
          onClose={() => setActiveId(null)}
          onSave={updateWord}
          onDelete={(id) => {
            deleteWord(id);
            setActiveId(null);
          }}
        />
      )}
    </div>
  );
}

function DefinitionModal({
  word,
  onClose,
  onSave,
  onDelete,
}: {
  word: VocabWord;
  onClose: () => void;
  onSave: (id: string, patch: { word?: string; definition?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [wordText, setWordText] = useState(word.word);
  const [definitionText, setDefinitionText] = useState(word.definition ?? "");

  function save() {
    onSave(word.id, { word: wordText, definition: definitionText });
    setEditing(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <>
            <input
              value={wordText}
              onChange={(e) => setWordText(e.target.value)}
              className="w-full bg-transparent text-2xl font-semibold text-foreground outline-none"
              autoFocus
            />
            <textarea
              value={definitionText}
              onChange={(e) => setDefinitionText(e.target.value)}
              placeholder="Definition…"
              rows={4}
              className="mt-3 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setWordText(word.word);
                  setDefinitionText(word.definition ?? "");
                  setEditing(false);
                }}
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-foreground">{word.word}</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {word.definition || <span className="italic text-muted">No definition yet.</span>}
            </p>
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-hover"
              >
                Edit
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onDelete(word.id)}
                  className="text-xs text-red-600 transition-colors hover:text-red-500"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-muted transition-colors hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
