// Server-side helper for reading what's currently playing on the connected
// Spotify account. Single-user app: credentials live in env vars (see
// app/api/podcasts/spotify/auth + callback for how SPOTIFY_REFRESH_TOKEN gets
// minted), no database or per-user OAuth involved — mirrors lib/googleCalendar.ts.

export function spotifyConfigured(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN,
  );
}

type SpotifyTokenResponse = { access_token: string; expires_in: number };

// Module-scope cache so we don't refresh on every request within a warm
// serverless instance; harmless to lose on cold start.
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 10_000) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Spotify not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) {
    // Surface Spotify's actual reason (invalid_grant/invalid_client/etc.), not
    // just the HTTP status — the status code alone doesn't say whether the
    // refresh token, client ID, or client secret is the problem.
    const body = (await res.json().catch(() => null)) as { error?: string; error_description?: string } | null;
    const reason = body?.error_description || body?.error || `HTTP ${res.status}`;
    throw new Error(`Spotify token refresh failed: ${reason}`);
  }

  const data = (await res.json()) as SpotifyTokenResponse;
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export type SpotifyNowPlaying =
  | { isEpisode: true; isPlaying: boolean; title: string; show?: string; host?: string; coverUrl?: string; sourceUrl: string; progressMs?: number }
  | { isEpisode: false; isPlaying: boolean };

type SpotifyImage = { url: string };
type SpotifyShow = { name?: string; publisher?: string; images?: SpotifyImage[] };
type SpotifyPlaybackItem = {
  type: string;
  name: string;
  images?: SpotifyImage[];
  show?: SpotifyShow;
  external_urls?: { spotify?: string };
};
type SpotifyCurrentPlayback = { item?: SpotifyPlaybackItem; progress_ms?: number; is_playing?: boolean };

/** Null when nothing is playing at all; { isEpisode: false, ... } when the
 *  playing item is a song, not a podcast episode. */
export async function fetchCurrentlyPlaying(): Promise<SpotifyNowPlaying | null> {
  const token = await getAccessToken();
  const url = new URL("https://api.spotify.com/v1/me/player/currently-playing");
  url.searchParams.set("additional_types", "episode");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify playback fetch failed: ${res.status}`);

  const data = (await res.json()) as SpotifyCurrentPlayback;
  const item = data.item;
  if (!item) return null;

  if (item.type !== "episode") {
    return { isEpisode: false, isPlaying: Boolean(data.is_playing) };
  }

  const sourceUrl = item.external_urls?.spotify;
  if (!sourceUrl) return { isEpisode: false, isPlaying: Boolean(data.is_playing) };

  return {
    isEpisode: true,
    isPlaying: Boolean(data.is_playing),
    title: item.name,
    show: item.show?.name,
    host: item.show?.publisher,
    coverUrl: item.images?.[0]?.url ?? item.show?.images?.[0]?.url,
    sourceUrl,
    progressMs: data.progress_ms,
  };
}
