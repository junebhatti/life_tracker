"use client";

import { useEffect, useRef, useState } from "react";
import { useLibrary } from "./LibraryStore";
import { usePeople } from "./PeopleStore";
import { parseMarkdownNote } from "@/lib/library";
import {
  clearVaultHandle,
  collectMarkdownFiles,
  ensureReadPermission,
  loadVaultHandle,
  queryReadPermission,
  saveVaultHandle,
  supportsFsAccess,
} from "@/lib/vaultHandle";

type Result = {
  scanned: number;
  created: number;
  updated: number;
  linkedToPeople: number;
  newPeople: number;
};

const LAST_SYNCED_KEY = "obsidian_last_synced_at";

type PickerWindow = Window & {
  showDirectoryPicker: (opts?: {
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
};

/** Syncs a local folder (e.g. an Obsidian vault) into the Library. On Chromium
 *  browsers the picked folder is remembered (File System Access API), so after
 *  the first pick, re-pulling your latest notes is a single "Re-sync now" click
 *  — no folder navigation. Safari/Firefox fall back to re-picking each time.
 *
 *  Sync is one-way (local files -> Supabase) and manual: a hosted web app can't
 *  read your laptop's files on its own, so there's no true background refresh —
 *  but with a remembered folder, re-syncing is a single click. */
export default function ObsidianSync() {
  const { syncNotes } = useLibrary();
  const { ensurePeopleByName } = usePeople();
  const inputRef = useRef<HTMLInputElement>(null);

  const fsSupported = supportsFsAccess();
  const [savedFolder, setSavedFolder] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didAutoSync = useRef(false);

  // Restore the last-sync time shown in the UI.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSyncedAt(localStorage.getItem(LAST_SYNCED_KEY));
  }, []);

  /** Parse a batch of Markdown files and upsert them into the Library. */
  const processFiles = async (files: { path: string; file: File }[]) => {
    const mdFiles = files.filter(
      (f) =>
        f.path.toLowerCase().endsWith(".md") && !f.path.includes("/.obsidian/"),
    );

    const parsed = await Promise.all(
      mdFiles.map(async ({ path, file }) =>
        parseMarkdownNote(
          path,
          await file.text(),
          new Date(file.lastModified).toISOString(),
        ),
      ),
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
      category: n.category,
      personIds: n.personNames
        .map((name) => idsByName[name.toLowerCase()])
        .filter((id): id is string => !!id),
      sourceModifiedAt: n.sourceModifiedAt,
    }));

    const summary = await syncNotes(rows);

    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNCED_KEY, now);
    setLastSyncedAt(now);
    setResult({
      scanned: mdFiles.length,
      created: summary.created,
      updated: summary.updated,
      linkedToPeople: rows.filter((r) => r.personIds.length > 0).length,
      newPeople: createdNames.length,
    });
  };

  const runSync = async (
    loader: () => Promise<{ path: string; file: File }[]>,
  ) => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const files = await loader();
      if (files.length === 0) {
        setError("No Markdown notes found in that folder.");
        return;
      }
      await processFiles(files);
    } catch (e) {
      // The user dismissing the folder picker throws AbortError; ignore it.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // --- File System Access API path (Chromium): remembers the folder. ---

  const pickFolder = () =>
    runSync(async () => {
      const handle = await (window as unknown as PickerWindow).showDirectoryPicker(
        { mode: "read" },
      );
      await saveVaultHandle(handle);
      setSavedFolder(handle.name);
      return collectMarkdownFiles(handle, `${handle.name}/`);
    });

  const reSync = () =>
    runSync(async () => {
      const handle = await loadVaultHandle();
      if (!handle) throw new Error("No saved folder. Choose your vault first.");
      const ok = await ensureReadPermission(handle);
      if (!ok) throw new Error("Permission to read the folder was denied.");
      return collectMarkdownFiles(handle, `${handle.name}/`);
    });

  const forgetFolder = async () => {
    await clearVaultHandle();
    setSavedFolder(null);
    setResult(null);
  };

  // On mount: restore the remembered folder, and — if the browser still trusts
  // us with it (no prompt needed) — auto-pull the latest notes. That gives
  // "re-syncs when I reopen the tab" whenever the permission has persisted;
  // otherwise the manual "Re-sync now" button re-grants it with one click.
  useEffect(() => {
    if (!fsSupported || didAutoSync.current) return;
    didAutoSync.current = true;

    loadVaultHandle()
      .then(async (handle) => {
        if (!handle) return;
        setSavedFolder(handle.name);
        if ((await queryReadPermission(handle)) !== "granted") return;
        setAutoSynced(true);
        await runSync(() => collectMarkdownFiles(handle, `${handle.name}/`));
      })
      .catch(() => {});
    // Runs once per mount (guarded by didAutoSync); runSync is captured fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsSupported]);

  // --- Fallback path (Safari/Firefox): plain folder <input>, re-pick each time. ---

  const handleInputFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).map((file) => ({
      path: file.webkitRelativePath || file.name,
      file,
    }));
    runSync(async () => files).finally(() => {
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const lastSyncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">Obsidian vault</h2>
      <p className="mt-1 text-sm text-muted">
        Pick your vault folder and its Markdown notes sync into the Library,
        grouped into tabs by the top-level folder each note lives under (e.g.
        everything inside &quot;Quotes/&quot;, however deeply nested, becomes
        the &quot;Quotes&quot; tab). A note is linked to a person on the
        People page if it
        lives in a folder named{" "}
        <code className="rounded bg-hover px-1">Calls</code> and is named after
        them (e.g.{" "}
        <code className="rounded bg-hover px-1">People/Calls/Jane Doe.md</code>),
        or it has a <code className="rounded bg-hover px-1">person</code> /{" "}
        <code className="rounded bg-hover px-1">people</code> frontmatter field.
        Title, body, and frontmatter tags always reflect the Obsidian file, but
        any tags you add in the Library stay put.
      </p>

      {fsSupported ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {savedFolder ? (
              <>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={reSync}
                  className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
                >
                  {syncing ? "Syncing…" : "Re-sync now"}
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={pickFolder}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Change folder
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={forgetFolder}
                  className="text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-accent disabled:opacity-40"
                >
                  Forget
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={syncing}
                onClick={pickFolder}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
              >
                {syncing ? "Syncing…" : "Choose vault folder & sync"}
              </button>
            )}
          </div>
          {savedFolder && (
            <p className="mt-2 text-xs text-muted">
              Remembered folder:{" "}
              <span className="text-foreground">{savedFolder}</span>.{" "}
              {autoSynced
                ? "Auto-synced when you opened this page. "
                : "It re-syncs automatically when you reopen this page, as long as your browser still has permission. "}
              Click <span className="text-foreground">Re-sync now</span> any time
              to pull your latest notes — no re-picking.
            </p>
          )}
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleInputFiles(e.target.files)}
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
          <p className="mt-2 text-xs text-muted">
            This browser can&apos;t remember the folder, so you&apos;ll pick it
            each time. For one-click re-syncing, use Chrome, Edge, or Brave.
          </p>
        </>
      )}

      {lastSyncedLabel && (
        <p className="mt-2 text-xs text-muted">Last synced {lastSyncedLabel}.</p>
      )}
      {result && (
        <p className="mt-1 text-xs text-muted">
          Scanned {result.scanned} note{result.scanned === 1 ? "" : "s"} ·{" "}
          {result.created} new, {result.updated} updated ·{" "}
          {result.linkedToPeople} linked to people
          {result.newPeople > 0 ? ` (${result.newPeople} new)` : ""}.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  );
}
