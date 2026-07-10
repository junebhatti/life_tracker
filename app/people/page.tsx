"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { usePeople } from "@/components/PeopleStore";
import { useLibrary } from "@/components/LibraryStore";

export default function PeoplePage() {
  const { people, hydrated, addPerson, deletePerson } = usePeople();
  const { notes, editNote } = useLibrary();
  const [name, setName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Group notes under each person. Duplicate rows left over from syncing the
  // vault under two different path prefixes are collapsed by content, so each
  // call note appears once.
  const notesByPersonId = useMemo(() => {
    const map = new Map<string, typeof notes>();
    for (const note of notes) {
      for (const personId of note.personIds) {
        const existing = map.get(personId);
        if (existing) existing.push(note);
        else map.set(personId, [note]);
      }
    }
    for (const [personId, list] of map) {
      const seen = new Set<string>();
      map.set(
        personId,
        list.filter((n) => {
          const key = `${n.manualTitle ?? n.title} ${n.manualContent ?? n.content}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      );
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
              className="shrink-0 rounded-md bg-[#2323e8] px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
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
                        onClick={() => {
                          setExpandedId(expanded ? null : person.id);
                          setEditingNoteId(null);
                        }}
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
                          linkedNotes.map((note) => {
                            const noteTitle = note.manualTitle ?? note.title;
                            const noteContent =
                              note.manualContent ?? note.content;
                            const editingNote = editingNoteId === note.id;
                            return (
                              <div
                                key={note.id}
                                className="rounded-md bg-hover p-3"
                              >
                                {editingNote ? (
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="text"
                                      value={editTitle}
                                      onChange={(e) =>
                                        setEditTitle(e.target.value)
                                      }
                                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground outline-none focus:border-neutral-400"
                                    />
                                    <textarea
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                      rows={6}
                                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-neutral-400"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          editNote(
                                            note.id,
                                            editTitle,
                                            editContent,
                                          );
                                          setEditingNoteId(null);
                                        }}
                                        className="rounded-md bg-[#2323e8] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingNoteId(null)}
                                        className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group/note flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-foreground">
                                        {noteTitle}
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted">
                                        {noteContent}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditTitle(noteTitle);
                                        setEditContent(noteContent);
                                      }}
                                      className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-foreground group-hover/note:opacity-100"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
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
