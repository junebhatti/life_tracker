"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useLibrary } from "@/components/LibraryStore";
import { usePeople } from "@/components/PeopleStore";
import { sourceLabel } from "@/lib/podcast";

const ALL_CATEGORY = "All";
const PEOPLE_CATEGORY = "People";

function formatNoteDate(value: string): string {
  return new Date(value)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

/** Podcast cover art for a Library note, with a graceful fallback. */
function CoverThumb({ url, size }: { url: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded bg-hover text-muted"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ♪
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt="Podcast cover art"
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className="shrink-0 rounded object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export default function LibraryPage() {
  const {
    notes,
    hydrated,
    deleteNote,
    editNote,
    addManualTag,
    removeManualTag,
  } = useLibrary();
  const { people } = usePeople();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people],
  );

  // All notes de-duped. Person-linked notes are included here and exposed via
  // the "People" category chip so you can filter to just those notes.
  const libraryNotes = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof notes = [];
    for (const n of notes) {
      const key = (n.manualTitle ?? n.title) + (n.manualContent ?? n.content) + (n.category ?? "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  }, [notes]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const n of libraryNotes) {
      if (n.category) set.add(n.category);
      if (n.personIds.length > 0) set.add(PEOPLE_CATEGORY);
    }
    return [ALL_CATEGORY, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [libraryNotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryNotes.filter((n) => {
      if (category === PEOPLE_CATEGORY) {
        if (n.personIds.length === 0) return false;
      } else if (category !== ALL_CATEGORY && n.category !== category) {
        return false;
      }
      if (!q) return true;
      return (
        (n.manualTitle ?? n.title).toLowerCase().includes(q) ||
        (n.manualContent ?? n.content).toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.manualTags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [libraryNotes, query, category]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (b.sourceModifiedAt ?? b.createdAt).localeCompare(
          a.sourceModifiedAt ?? a.createdAt,
        ),
      ),
    [filtered],
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Archive
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground">
              Library
            </h1>
            <span className="shrink-0 text-xs uppercase tracking-wider text-muted">
              {libraryNotes.length} {libraryNotes.length === 1 ? "entry" : "entries"}
            </span>
          </div>
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
            placeholder="Search notes..."
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
                      ? "bg-[#2323e8] text-white"
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
                {libraryNotes.length === 0
                  ? "No notes synced yet."
                  : "No notes match your search."}
              </p>
            )}

            {hydrated &&
              sorted.map((note) => {
                const expanded = expandedId === note.id;
                const editing = editingId === note.id;
                const title = note.manualTitle ?? note.title;
                const content = note.manualContent ?? note.content;
                const edited = note.manualTitle != null || note.manualContent != null;
                const linkedNames = note.personIds
                  .map((id) => peopleById.get(id))
                  .filter((n): n is string => !!n);
                const dateLabel = formatNoteDate(
                  note.sourceModifiedAt ?? note.createdAt,
                );
                return (
                  <div
                    key={note.id}
                    className="group border-b border-border py-3"
                  >
                    <div className="flex items-start gap-3">
                      {note.metadata?.coverUrl && (
                        <CoverThumb url={note.metadata.coverUrl} size={44} />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(expanded ? null : note.id);
                          setNewTag("");
                          setEditingId(null);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-muted">
                          {note.category && (
                            <span className="text-foreground">{note.category}</span>
                          )}
                          {linkedNames.map((name) => (
                            <span key={name} className="text-foreground">
                              {name}
                            </span>
                          ))}
                          {note.tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                          {note.manualTags.map((tag) => (
                            <span key={tag} className="text-foreground">
                              #{tag}
                            </span>
                          ))}
                          {edited && <span>· Edited</span>}
                        </div>
                        {!expanded && (
                          <p className="mt-1 line-clamp-2 text-sm text-foreground">
                            {content || title}
                          </p>
                        )}
                      </button>
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted">
                        {dateLabel}
                      </span>
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
                        {editing ? (
                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-[11px] uppercase tracking-wider text-muted">
                                Title
                              </span>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-neutral-400"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[11px] uppercase tracking-wider text-muted">
                                Body
                              </span>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={10}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-neutral-400"
                              />
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  editNote(note.id, editTitle, editContent);
                                  setEditingId(null);
                                }}
                                className="rounded-md bg-[#2323e8] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {note.metadata?.coverUrl && (
                              <CoverThumb url={note.metadata.coverUrl} size={120} />
                            )}
                            <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">
                              {title}
                            </h2>
                            {note.metadata?.show && (
                              <p className="text-xs text-muted">{note.metadata.show}</p>
                            )}
                            {note.metadata?.sourceUrl && (
                              <a
                                href={note.metadata.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="self-start text-[11px] font-medium uppercase tracking-wider text-accent hover:underline"
                              >
                                Open in {sourceLabel(note.metadata.sourceUrl)} ↗
                              </a>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {content}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(note.id);
                                setEditTitle(title);
                                setEditContent(content);
                              }}
                              className="mt-1 self-start rounded-md border border-border px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                            >
                              Edit note
                            </button>
                          </div>
                        )}
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
                                x
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
                              placeholder="Add a tag..."
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
