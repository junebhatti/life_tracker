"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useLibrary } from "@/components/LibraryStore";
import { usePeople } from "@/components/PeopleStore";

const ALL_CATEGORY = "All";

export default function LibraryPage() {
  const { notes, hydrated, deleteNote, addManualTag, removeManualTag } =
    useLibrary();
  const { people } = usePeople();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) if (n.category) set.add(n.category);
    return [ALL_CATEGORY, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (category !== ALL_CATEGORY && n.category !== category) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.manualTags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [notes, query, category]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.syncedAt.localeCompare(a.syncedAt)),
    [filtered],
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Library
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Library
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Notes synced in from Obsidian. Sync your vault from{" "}
            <Link
              href="/settings"
              className="text-foreground underline underline-offset-2"
            >
              Settings
            </Link>
            .
          </p>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="mt-6 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />

          {categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                    category === c
                      ? "bg-neutral-800 text-white"
                      : "border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col">
            {!hydrated && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded bg-hover"
                  />
                ))}
              </div>
            )}

            {hydrated && sorted.length === 0 && (
              <p className="text-sm text-muted">
                {notes.length === 0
                  ? "No notes synced yet."
                  : "No notes match your search."}
              </p>
            )}

            {hydrated &&
              sorted.map((note) => {
                const expanded = expandedId === note.id;
                const linkedNames = note.personIds
                  .map((id) => peopleById.get(id))
                  .filter((n): n is string => !!n);
                return (
                  <div
                    key={note.id}
                    className="group border-b border-border py-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(expanded ? null : note.id);
                          setNewTag("");
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {note.category && (
                            <span className="text-[11px] uppercase tracking-wide text-muted">
                              {note.category}
                            </span>
                          )}
                          <p className="text-sm font-medium text-foreground">
                            {note.title}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-muted">
                          {linkedNames.map((name) => (
                            <span key={name}>{name}</span>
                          ))}
                          {note.tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                          {note.manualTags.map((tag) => (
                            <span key={tag} className="text-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 flex flex-col gap-3">
                        <pre className="whitespace-pre-wrap rounded-md bg-hover p-3 text-xs text-foreground">
                          {note.content}
                        </pre>
                        <div className="flex flex-wrap items-center gap-2">
                          {note.manualTags.map((tag) => (
                            <span
                              key={tag}
                              className="flex items-center gap-1 rounded-md bg-hover px-2 py-1 text-[11px] uppercase tracking-wide text-foreground"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() => removeManualTag(note.id, tag)}
                                className="text-muted hover:text-accent"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              addManualTag(note.id, newTag);
                              setNewTag("");
                            }}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Add a tag…"
                              className="w-28 rounded-md border border-border px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
                            />
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
