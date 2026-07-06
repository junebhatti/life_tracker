import { NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { fetchCurrentlyPlaying, spotifyConfigured } from "@/lib/spotify";
import type { NextRequest } from "next/server";

// Never statically cache — always a fresh read of live playback state.
export const dynamic = "force-dynamic";

/** What's playing right now on the connected Spotify account, for the
 *  "Import current episode" button and live timestamp insertion. */
export async function GET(request: NextRequest) {
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!spotifyConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const nowPlaying = await fetchCurrentlyPlaying();
    return NextResponse.json({ configured: true, nowPlaying });
  } catch (error) {
    console.error("Spotify now-playing fetch failed:", error);
    return NextResponse.json({ configured: true, error: "Couldn't reach Spotify." }, { status: 502 });
  }
}
