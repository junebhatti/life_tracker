import { NextRequest, NextResponse } from "next/server";
import { debugStepsRollup, googleHealthConfigured } from "@/lib/googleHealth";
import { userIdFromRequest } from "@/lib/serverAuth";

// Never cache — this is a live diagnostic of the raw Google Health payload.
export const dynamic = "force-dynamic";

/** Owner-only: dumps the raw steps rollup so field-name mismatches are visible.
 *  Visit /api/health/debug while logged in. */
export async function GET(request: NextRequest) {
  if (!googleHealthConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
  // Single-user app: require an authenticated owner (bearer or cookie), or the
  // configured OWNER_USER_ID as a fallback so it works from a plain browser tab.
  const userId = (await userIdFromRequest(request)) ?? process.env.OWNER_USER_ID ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const timezone = request.nextUrl.searchParams.get("timezone") ?? undefined;
  try {
    const data = await debugStepsRollup(timezone);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
