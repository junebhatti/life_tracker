// Persists the Obsidian vault folder the user picked (via the File System
// Access API) in IndexedDB, so re-syncing is a single click instead of
// re-navigating the folder picker every time. A directory handle is a
// structured-cloneable object, so IndexedDB can store it across sessions.
//
// Chromium-only (Chrome/Edge/Brave): callers must feature-detect with
// supportsFsAccess() and fall back to a plain <input webkitdirectory> picker
// on Safari/Firefox, where re-picking the folder each time is unavoidable.

const DB_NAME = "life_tracker_vault";
const STORE = "handles";
const KEY = "vault";

/** True when this browser supports the File System Access API (showDirectoryPicker). */
export function supportsFsAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVaultHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  try {
    return await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () =>
          resolve((req.result as FileSystemDirectoryHandle) ?? null);
        req.onerror = () => reject(req.error);
      },
    );
  } finally {
    db.close();
  }
}

export async function clearVaultHandle(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

type PermissionState = "granted" | "denied" | "prompt";
type HandleWithPermission = FileSystemDirectoryHandle & {
  queryPermission?: (opts: {
    mode: "read" | "readwrite";
  }) => Promise<PermissionState>;
  requestPermission?: (opts: {
    mode: "read" | "readwrite";
  }) => Promise<PermissionState>;
};

/** Checks read access to a saved folder WITHOUT prompting — safe to call on
 *  page load. Returns "granted" only if the browser still trusts us with the
 *  folder; "prompt" means a user click is needed to re-grant (so auto-sync on
 *  load isn't possible and the manual button must be used). */
export async function queryReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  const h = handle as HandleWithPermission;
  if (!h.queryPermission) return "granted";
  return h.queryPermission({ mode: "read" });
}

/** Re-checks (and if needed re-prompts for) read access to a saved folder.
 *  Must be called from a user gesture so the permission prompt can show. */
export async function ensureReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const h = handle as HandleWithPermission;
  if (!h.queryPermission || !h.requestPermission) return true;
  if ((await h.queryPermission({ mode: "read" })) === "granted") return true;
  return (await h.requestPermission({ mode: "read" })) === "granted";
}

/** Walks a directory handle recursively, collecting every Markdown file with a
 *  vault-relative path (prefixed with the folder name, like webkitRelativePath).
 *  Skips dot-folders such as `.obsidian` and `.trash`. */
export async function collectMarkdownFiles(
  dir: FileSystemDirectoryHandle,
  prefix: string,
): Promise<{ path: string; file: File }[]> {
  const out: { path: string; file: File }[] = [];
  // values() is part of the spec but not yet in TS's DOM lib types.
  const entries = (
    dir as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    }
  ).values();
  for await (const entry of entries) {
    if (entry.kind === "directory") {
      if (entry.name.startsWith(".")) continue;
      const child = await collectMarkdownFiles(
        entry as FileSystemDirectoryHandle,
        `${prefix}${entry.name}/`,
      );
      out.push(...child);
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      const file = await (entry as FileSystemFileHandle).getFile();
      out.push({ path: `${prefix}${entry.name}`, file });
    }
  }
  return out;
}
