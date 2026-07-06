"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useLibrary } from "@/components/LibraryStore";
import {
  extractUrl,
  normalizeContentUrl,
  sourceLabel,
  episodeToMarkdown,
  type PodcastMeta,
} from "@/lib/podcast";
import type { LibraryNote } from "@/lib/library";

type FetchedMeta = {
  title: string;
  show: string;
  host: string;
  coverUrl: string;
  sourceUrl: string;
  sourceLabel: string;
};

function parseTags(entry: string): string[] {
  return [
    ...new Set(
      entry
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t.slice(1) : t)),
    ),
  ];
}

function displayTags(tags: string[]): string[] {
  return tags.filter((t) => t.toUpperCase() !== "PODCASTS");
}

function episodeTitle(n: LibraryNote): string {
  return n.manualTitle || n.title || "Untitled Episode";
}

function episodeBody(n: LibraryNote): string {
  return n.manualContent ?? n.content ?? "";
}

function Artwork({ url, size }: { url?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md bg-hover text-muted"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ♪
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt="Episode cover art"
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export default function PodcastsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { notes, addPodcastEpisode, savePodcastEpisode, deleteNote } = useLibrary();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Import form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [show, setShow] = useState("");
  const [host, setHost] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const episodes = useMemo(() => notes.filter((n) => n.category === "Podcasts"), [notes]);
  const active = activeId ? episodes.find((e) => e.id === activeId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter(
      (e) =>
        episodeTitle(e).toLowerCase().includes(q) ||
        (e.metadata?.show ?? "").toLowerCase().includes(q) ||
        episodeBody(e).toLowerCase().includes(q),
    );
  }, [episodes, search]);

  async function doFetch() {
    const raw = url.trim();
    if (!raw) return setStatus("Paste a Spotify or YouTube link first.");
    if (!normalizeContentUrl(raw)) return setStatus("That doesn't look like a Spotify episode or YouTube link.");
    setBusy(true);
    setStatus("Fetching…");
    try {
      const res = await fetch(`/api/podcasts/metadata?url=${encodeURIComponent(raw)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error();
      const meta = (await res.json()) as FetchedMeta;
      setTitle(meta.title);
      setShow(meta.show);
      setHost(meta.host);
      setCoverUrl(meta.coverUrl);
      setStatus(`Imported from ${meta.sourceLabel}.`);
    } catch {
      setStatus("Couldn't auto-import. Fill the fields in manually.");
    }
    setBusy(false);
  }

  function create() {
    const normalized = normalizeContentUrl(url) ?? url.trim();
    if (!normalized && !title.trim()) return setStatus("Enter a valid link or a title.");
    const meta: PodcastMeta = {
      sourceUrl: normalized,
      sourceLabel: sourceLabel(normalized),
      coverUrl: coverUrl.trim() || undefined,
      show: show.trim() || undefined,
      host: host.trim() || undefined,
    };
    const id = addPodcastEpisode({ title: title.trim() || "Untitled Episode", meta, tags: parseTags(tags) });
    setUrl(""); setTitle(""); setShow(""); setHost(""); setCoverUrl(""); setTags(""); setStatus("");
    setActiveId(id);
  }

  async function copyMarkdown(ep: LibraryNote) {
    const md = episodeToMarkdown({
      title: episodeTitle(ep),
      meta: ep.metadata ?? { sourceUrl: "" },
      body: episodeBody(ep),
      tags: parseTags(displayTags(ep.tags).join(", ")),
      updatedAt: new Date().toLocaleString(),
    });
    try {
      await navigator.clipboard.writeText(md);
      setStatus("Markdown copied to clipboard.");
    } catch {
      setStatus("Clipboard blocked by the browser.");
    }
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
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Podcast Notes</h1>
            <span className="text-lg text-muted">/{episodes.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Import a Spotify or YouTube episode and take notes — each one is filed into your Library under
            “Podcasts”.
          </p>

          {active ? (
            <Editor
              episode={active}
              onBack={() => setActiveId(null)}
              onSave={savePodcastEpisode}
              onDelete={(id) => {
                deleteNote(id);
                setActiveId(null);
              }}
              onCopy={copyMarkdown}
            />
          ) : (
            <>
              {/* Import panel */}
              <section className="mt-8 rounded-xl border border-border p-5">
                <p className="text-[11px] uppercase tracking-wider text-muted">Import episode</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doFetch()}
                    placeholder="Spotify or YouTube link"
                    className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.readText().then((t) => setUrl(extractUrl(t) ?? t)).catch(() => {})}
                    className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-hover"
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    onClick={doFetch}
                    disabled={busy}
                    className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
                  >
                    {busy ? "…" : "Fetch"}
                  </button>
                </div>

                {status && <p className="mt-2 text-xs text-muted">{status}</p>}

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode title" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none" />
                  <input value={show} onChange={(e) => setShow(e.target.value)} placeholder="Podcast / show" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none" />
                  <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Cover image URL" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none" />
                  <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none" />
                </div>

                <button
                  type="button"
                  onClick={create}
                  className="mt-3 w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background"
                >
                  Create note
                </button>
              </section>

              {/* List */}
              <div className="mt-8">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search titles, shows, notes…"
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
                />
                {filtered.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">
                    {episodes.length === 0
                      ? "No episodes yet — import one above to start a note."
                      : "No episodes match your search."}
                  </p>
                ) : (
                  <div className="mt-2">
                    {filtered.map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => setActiveId(ep.id)}
                        className="flex w-full items-center gap-3 border-b border-border py-3 text-left transition-colors hover:bg-hover"
                      >
                        <Artwork url={ep.metadata?.coverUrl} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{episodeTitle(ep)}</p>
                          {ep.metadata?.show && <p className="truncate text-xs text-muted">{ep.metadata.show}</p>}
                          {displayTags(ep.tags).length > 0 && (
                            <p className="mt-0.5 truncate text-[11px] text-muted">
                              {displayTags(ep.tags).map((t) => `#${t}`).join("  ")}
                            </p>
                          )}
                        </div>
                        <span className="text-muted">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Editor({
  episode,
  onBack,
  onSave,
  onDelete,
  onCopy,
}: {
  episode: LibraryNote;
  onBack: () => void;
  onSave: (id: string, patch: { title?: string; content?: string; tags?: string[]; meta?: PodcastMeta }) => void;
  onDelete: (id: string) => void;
  onCopy: (ep: LibraryNote) => void;
}) {
  const meta = episode.metadata;
  const [title, setTitle] = useState(episodeTitle(episode));
  const [show, setShow] = useState(meta?.show ?? "");
  const [tags, setTags] = useState(displayTags(episode.tags).join(", "));
  const [body, setBody] = useState(episodeBody(episode));

  const label = meta ? sourceLabel(meta.sourceUrl) : "Source";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted transition-colors hover:text-foreground">
          ‹ Back
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => onCopy(episode)} className="text-xs text-muted transition-colors hover:text-foreground">
            Copy Markdown
          </button>
          <button type="button" onClick={() => onDelete(episode.id)} className="text-xs text-red-600 transition-colors hover:text-red-500">
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-4">
        <Artwork url={meta?.coverUrl} size={72} />
        <div className="flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onSave(episode.id, { title })}
            placeholder="Episode title"
            className="w-full bg-transparent text-lg font-medium text-foreground outline-none"
          />
          <input
            value={show}
            onChange={(e) => setShow(e.target.value)}
            onBlur={() => onSave(episode.id, { meta: { ...(meta ?? { sourceUrl: "" }), show: show.trim() || undefined } })}
            placeholder="Podcast name"
            className="mt-1 w-full bg-transparent text-sm text-muted outline-none"
          />
        </div>
      </div>

      {meta?.sourceUrl && (
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-medium text-red-600 hover:text-red-500">
          Open in {label} ↗
        </a>
      )}

      <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">Tags</p>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        onBlur={() => onSave(episode.id, { tags: parseTags(tags) })}
        placeholder="add tags, comma separated"
        className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
      />

      <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">Notes</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => onSave(episode.id, { content: body })}
        placeholder="Type your notes while you listen…"
        rows={16}
        className="mt-2 w-full rounded-lg border border-border bg-transparent px-4 py-3 text-[15px] leading-7 text-foreground outline-none"
      />
    </section>
  );
}
