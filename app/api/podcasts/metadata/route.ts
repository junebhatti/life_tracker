import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { normalizeContentUrl, oEmbedUrl, sourceLabel, detectSource, youtubeVideoId } from "@/lib/podcast";

// Never statically cache — metadata is fetched live from Spotify/YouTube.
export const dynamic = "force-dynamic";

export type PodcastMetadata = {
  title: string;
  show: string;
  host: string;
  coverUrl: string;
  sourceUrl: string;
  sourceLabel: string;
};

/** Fetches episode metadata (title, show, host, cover art) from a Spotify or
 *  YouTube link via oEmbed, with an HTML-scrape fallback for YouTube. Mirrors
 *  the original native app's MediaMetadataFetcher. */
export async function GET(request: NextRequest) {
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = request.nextUrl.searchParams.get("url")?.trim();
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const normalized = normalizeContentUrl(raw);
  if (!normalized) {
    return NextResponse.json(
      { error: "Not a Spotify episode or YouTube video link" },
      { status: 422 },
    );
  }

  const source = detectSource(normalized);

  try {
    const meta = await fetchViaOEmbed(normalized);
    return NextResponse.json(meta);
  } catch {
    if (source === "youtube") {
      try {
        const meta = await fetchYouTubeFallback(normalized);
        return NextResponse.json(meta);
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(
      { error: "Could not fetch metadata; fill fields manually." },
      { status: 502 },
    );
  }
}

async function fetchViaOEmbed(normalized: string): Promise<PodcastMetadata> {
  const endpoint = oEmbedUrl(normalized);
  if (!endpoint) throw new Error("No oEmbed endpoint");

  const res = await fetch(endpoint, { headers: { "User-Agent": "LifeTracker/1.0" } });
  if (!res.ok) throw new Error(`oEmbed ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;

  const rawTitle = String(json.title ?? "");
  // Many oEmbed titles read "Episode name - Show name"; split the show off the end.
  const parts = rawTitle.split(" - ");
  const title = parts.length > 1 ? parts.slice(0, -1).join(" - ").trim() : rawTitle;
  const show = parts.length > 1 ? (parts[parts.length - 1] ?? "").trim() : String(json.provider_name ?? "");
  const host = String(json.author_name ?? "");
  const coverUrl = String(json.thumbnail_url ?? "");

  return { title, show, host, coverUrl, sourceUrl: normalized, sourceLabel: sourceLabel(normalized) };
}

async function fetchYouTubeFallback(normalized: string): Promise<PodcastMetadata> {
  const res = await fetch(normalized, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`YouTube ${res.status}`);
  const html = await res.text();

  const ogTitle = metaContent(html, "property", "og:title") ?? htmlTitle(html) ?? "YouTube Video";
  const siteName = metaContent(html, "property", "og:site_name") ?? "YouTube";
  const host = metaContent(html, "name", "author") ?? "";
  const videoId = youtubeVideoId(normalized);
  const coverUrl =
    metaContent(html, "property", "og:image") ??
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

  return {
    title: ogTitle.replace(/ - YouTube$/, ""),
    show: siteName,
    host,
    coverUrl,
    sourceUrl: normalized,
    sourceLabel: sourceLabel(normalized),
  };
}

function metaContent(html: string, attr: "property" | "name", key: string): string | undefined {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : undefined;
}

function htmlTitle(html: string): string | undefined {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1]) : undefined;
}

function decodeEntities(v: string): string {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
