import { NextRequest, NextResponse } from "next/server";

// Enough to read what's currently playing (including podcast episodes) —
// no write/modify scopes requested.
const SCOPE = "user-read-email user-read-private user-read-currently-playing user-read-playback-state";

/** Kicks off the one-time consent flow that mints a refresh token. */
export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing SPOTIFY_CLIENT_ID environment variable.", { status: 500 });
  }

  const redirectUri = new URL("/api/podcasts/spotify/callback", request.url).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPE,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
