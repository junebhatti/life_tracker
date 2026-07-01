import { NextRequest, NextResponse } from "next/server";
import { fetchHealthSnapshot, googleHealthConfigured } from "@/lib/googleHealth";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

/** Civil-day (YYYY-MM-DD) string for the given IANA timezone. */
function civilDateKey(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** Best-effort: saves today's sleep/RHR/steps so the Trends page has history to graph. */
async function recordDailyMetrics(
  request: NextRequest,
  timezone: string | undefined,
  snapshot: Awaited<ReturnType<typeof fetchHealthSnapshot>>,
) {
  if (!supabaseAdminConfigured()) return;
  // Prefer the authenticated caller's user ID; fall back to a configured owner
  // ID so history still accumulates even when the widget loads before the
  // Supabase session resolves (or on deployments where auth cookies cleared).
  let userId = await userIdFromRequest(request);
  if (!userId) userId = process.env.OWNER_USER_ID ?? null;
  if (!userId) return;

  const date = civilDateKey(timezone || "UTC");
  const { error } = await supabaseAdmin()
    .from("health_metrics_daily")
    .upsert(
      {
        id: `health_${userId}_${date}`,
        user_id: userId,
        date,
        sleep_hours: snapshot.sleep?.hours ?? null,
        resting_heart_rate: snapshot.restingHeartRate ?? null,
        steps: snapshot.steps ?? null,
      },
      { onConflict: "user_id,date" },
    );
  if (error) console.error("Failed to record daily health metrics:", error);
}

export async function GET(request: NextRequest) {
  if (!googleHealthConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const timezone = request.nextUrl.searchParams.get("timezone") ?? undefined;

  try {
    const snapshot = await fetchHealthSnapshot(timezone);
    await recordDailyMetrics(request, timezone, snapshot);
    return NextResponse.json({ configured: true, snapshot });
  } catch (error) {
    console.error("Google Health snapshot fetch failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { configured: true, error: "Couldn't load health data.", detail },
      { status: 502 },
    );
  }
}
