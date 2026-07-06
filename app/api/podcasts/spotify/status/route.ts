import { NextResponse } from "next/server";
import { fetchCurrentlyPlaying, spotifyConfigured } from "@/lib/spotify";

// Never statically cache — reflects live playback state.
export const dynamic = "force-dynamic";

/** Test panel for Settings: is the Spotify account actually reachable. */
export async function GET() {
  if (!spotifyConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const nowPlaying = await fetchCurrentlyPlaying();
    return NextResponse.json({ configured: true, connected: true, nowPlaying, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Spotify status check failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ configured: true, connected: false, error: detail, checkedAt: new Date().toISOString() });
  }
}
