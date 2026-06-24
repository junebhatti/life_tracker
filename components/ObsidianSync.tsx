"use client";

import { useRef, useState } from "react";
import { useLibrary } from "./LibraryStore";
import { usePeople } from "./PeopleStore";
import { parseMarkdownNote } from "@/lib/library";

type Result = {
  scanned: number;
  created: number;
  updated: number;
  linkedToPeople: number;
  newPeople: number;
};

/** Reads a local folder (e.g. an Obsidian vault) via the browser's folder
 *  picker and syncs its Markdown notes into the Library, linking notes to
 *  People when a note has a `person`/`people` frontmatter field. Manual and
 *  one-way (local files -> Supabase): there's no way for a hosted web app to
 *  reach into a laptop's filesystem on its own. */
export default function ObsidianSync() {
  const { syncNotes } = useLibrary();
  const { ensurePeopleByName } = usePeople();
  const inputRef = useRef<HTMLInputElement>(null);

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const mdFiles = Array.from(fileList).filter(
        (f) =>
          f.name.toLowerCase().endsWith(".md") &&
          !f.webkitRelativePath.includes("/.obsidian/"),
      );

      const parsed = await Promise.all(
        mdFiles.map(async (file) => {
          const raw = await file.text();
          return parseMarkdownNote(
            file.webkitRelativePath,
            raw,
            new Date(file.lastModified).toISOString(),
          );
        }),
      );

      const personNames = Array.from(
        new Set(parsed.flatMap((n) => n.personNames)),
      );
      const { idsByName, createdNames } = await ensurePeopleByName(personNames);

      const rows = parsed.map((n) => ({
        path: n.path,
        title: n.title,
        content: n.content,
        tags: n.tags,
        personIds: n.personNames
          .map((name) => idsByName[name.toLowerCase()])
          .filter((id): id is string => !!id),
        sourceModifiedAt: n.sourceModifiedAt,
      }));

      const summary = await syncNotes(rows);

      setResult({
        scanned: mdFiles.length,
        created: summary.created,
        updated: summary.updated,
        linkedToPeople: rows.filter((r) => r.personIds.length > 0).length,
        newPeople: createdNames.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">Obsidian vault</h2>
      <p className="mt-1 text-sm text-muted">
        Your notes only exist on this device, so syncing is manual: pick your
        vault folder (or any subfolder) and its Markdown notes are synced
        into the Library. A note is linked to a person on the People page
        if either: it lives in a folder named{" "}
        <code className="rounded bg-hover px-1">Calls and People</code> and
        is named after them (e.g.{" "}
        <code className="rounded bg-hover px-1">Jane Doe.md</code>), or it
        has a <code className="rounded bg-hover px-1">person</code> /{" "}
        <code className="rounded bg-hover px-1">people</code> frontmatter
        field (e.g. <code className="rounded bg-hover px-1">person: Jane Doe</code>
        ). Re-run this any time you&apos;ve updated your notes.
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        {...{ webkitdirectory: "true" }}
      />

      <button
        type="button"
        disabled={syncing}
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
      >
        {syncing ? "Syncing…" : "Choose vault folder & sync"}
      </button>

      {result && (
        <p className="mt-3 text-xs text-muted">
          Scanned {result.scanned} note{result.scanned === 1 ? "" : "s"} ·{" "}
          {result.created} new, {result.updated} updated ·{" "}
          {result.linkedToPeople} linked to people
          {result.newPeople > 0 ? ` (${result.newPeople} new)` : ""}.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-accent">{error}</p>}
    </div>
  );
}
