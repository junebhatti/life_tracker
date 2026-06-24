"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { usePeople } from "@/components/PeopleStore";
import { useLibrary } from "@/components/LibraryStore";

export default function PeoplePage() {
  const { people, hydrated, addPerson, deletePerson } = usePeople();
  const { notes } = useLibrary();
  const [name, setName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const notesByPersonId = useMemo(() => {
    const map = new Map<string, typeof notes>();
    for (const note of notes) {
      for (const personId of note.personIds) {
        const existing = map.get(personId);
        if (existing) existing.push(note);
        else map.set(personId, [note]);
      }
    }
    return map;
  }, [notes]);

  const sorted = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addPerson({ name: trimmed });
    setName("");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            People
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            People
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Contacts and relationships. Notes synced from Obsidian with a{" "}
            <code className="rounded bg-hover px-1">person</code> or{" "}
            <code className="rounded bg-hover px-1">people</code> frontmatter
            field link here automatically.
          </p>

          <form onSubmit={handleAdd} className="mt-6 flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add a person…"
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-neutral-800 px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700"
            >
              Add
            </button>
          </form>

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
              <p className="text-sm text-muted">No people yet.</p>
            )}

            {hydrated &&
              sorted.map((person) => {
                const expanded = expandedId === person.id;
                const linkedNotes = notesByPersonId.get(person.id) ?? [];
                return (
                  <div
                    key={person.id}
                    className="group border-b border-border py-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expanded ? null : person.id)
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {person.name}
                        </p>
                        {linkedNotes.length > 0 && (
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                            {linkedNotes.length} note
                            {linkedNotes.length === 1 ? "" : "s"}
                          </p>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePerson(person.id)}
                        className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 flex flex-col gap-2">
                        {linkedNotes.length === 0 ? (
                          <p className="text-xs text-muted">
                            No linked notes yet.
                          </p>
                        ) : (
                          linkedNotes.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-md bg-hover p-3"
                            >
                              <p className="text-xs font-medium text-foreground">
                                {note.title}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-xs text-muted">
                                {note.content}
                              </p>
                            </div>
                          ))
                        )}
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
