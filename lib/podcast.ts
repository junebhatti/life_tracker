// Podcast link parsing + Markdown export, ported from the original native
// PodcastNotes app's MediaLinkParser/MarkdownExporter. Framework-agnostic so
// the web app (lib/podcast.ts) and mobile app (mobile/src/lib/podcast.ts) can
// keep byte-identical copies.

/** Extra metadata a podcast episode carries beyond a plain library note. Stored
 *  in the library_notes.metadata jsonb column. */
export type PodcastMeta = {
  /** Canonical Spotify episode or YouTube video URL. */
  sourceUrl: string;
  /** "Spotify" | "YouTube" | "Source" — where the episode came from. */
  sourceLabel?: string;
  /** Cover art / thumbnail URL. */
  coverUrl?: string;
  /** Podcast / show name. */
  show?: string;
  /** Host / publisher. */
  host?: string;
};

export type PodcastSource = "spotify" | "youtube";

/** Pull the first URL-looking token out of pasted text (a share sheet often
 *  hands over "Check this out https://..."). Falls back to prefixing https://
 *  for bare domains we recognize. */
export function extractUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/https?:\/\/[^\s]+/i);
  if (match) return match[0];

  if (trimmed.includes("://")) return trimmed;

  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith("www.") ||
    lowered.startsWith("open.spotify.com/") ||
    lowered.startsWith("youtube.com/") ||
    lowered.startsWith("m.youtube.com/") ||
    lowered.startsWith("youtu.be/") ||
    lowered.includes("youtube.com/watch") ||
    lowered.includes("youtu.be/") ||
    lowered.includes("open.spotify.com/episode/")
  ) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/** Validate + normalize to a Spotify-episode or YouTube-watch URL, or null if
 *  the input isn't one of those. */
export function normalizeContentUrl(raw: string): string | null {
  const candidate = extractUrl(raw);
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("spotify.com") && url.pathname.includes("/episode/")) {
    return url.toString();
  }
  if (host.includes("youtube.com") && url.pathname === "/watch") {
    return url.toString();
  }
  if (host === "youtu.be" && url.pathname.length > 1) {
    return url.toString();
  }

  return null;
}

export function detectSource(raw: string): PodcastSource | null {
  const normalized = normalizeContentUrl(raw);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.toLowerCase();
  if (host.includes("spotify.com")) return "spotify";
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  return null;
}

export function sourceLabel(raw: string): string {
  switch (detectSource(raw)) {
    case "spotify":
      return "Spotify";
    case "youtube":
      return "YouTube";
    default:
      return "Source";
  }
}

/** oEmbed endpoint for a given episode URL (Spotify + YouTube both support it). */
export function oEmbedUrl(raw: string): string | null {
  const normalized = normalizeContentUrl(raw);
  if (!normalized) return null;
  const encoded = encodeURIComponent(normalized);
  const host = new URL(normalized).hostname.toLowerCase();

  if (host.includes("spotify.com")) {
    return `https://open.spotify.com/oembed?url=${encoded}`;
  }
  if (host.includes("youtube.com") || host === "youtu.be") {
    return `https://www.youtube.com/oembed?url=${encoded}&format=json`;
  }
  return null;
}

export function youtubeVideoId(raw: string): string | null {
  const normalized = normalizeContentUrl(raw);
  if (!normalized) return null;
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\/+/, "");
    return id || null;
  }
  if (host.includes("youtube.com")) {
    return url.searchParams.get("v");
  }
  return null;
}

/** Obsidian-ready Markdown export for an episode + its notes. */
export function episodeToMarkdown(input: {
  title: string;
  meta: PodcastMeta;
  body: string;
  tags: string[];
  updatedAt?: string;
}): string {
  const title = input.title.trim() || "Untitled Episode";
  const show = (input.meta.show ?? "").trim() || "Unknown Podcast";
  const tags = [...input.tags].sort();
  const normalizedTags = tags.map((t) => t.replace(/\s+/g, "-"));
  const yaml = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

  const lines: string[] = [
    "---",
    `title: ${yaml(title)}`,
    `podcast: ${yaml(show)}`,
    `source: ${input.meta.sourceUrl}`,
  ];
  if (input.updatedAt) lines.push(`captured: ${input.updatedAt}`);
  if (normalizedTags.length) {
    lines.push("tags:");
    normalizedTags.forEach((t) => lines.push(`  - ${t}`));
  }
  lines.push("---", "");
  lines.push(`# ${title}`, "");
  lines.push(`**Podcast:** ${show}`, "  ");
  lines.push(`**${input.meta.sourceLabel ?? "Source"}:** ${input.meta.sourceUrl}`);
  if (tags.length) {
    lines.push("  ");
    lines.push(`**Tags:** ${tags.map((t) => `#${t}`).join(" ")}`);
  }
  lines.push("", "## Notes", "");
  lines.push(input.body || "");
  return lines.join("\n");
}
