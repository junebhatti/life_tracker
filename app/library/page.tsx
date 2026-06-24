"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useLibrary } from "@/components/LibraryStore";
import { usePeople } from "@/components/PeopleStore";

export default function LibraryPage() {
  const { notes, hydrated, deleteNote } = useLibrary();
  const { people } = usePeople();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, query]);

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
                        onClick={() => setExpandedId(expanded ? null : note.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {note.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-muted">
                          {linkedNames.map((name) => (
                            <span key={name}>{name}</span>
                          ))}
                          {note.tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
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
                      <pre className="mt-3 whitespace-pre-wrap rounded-md bg-hover p-3 text-xs text-foreground">
                        {note.content}
                      </pre>
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
