import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

// Never statically cache this route — it's always freshly fetched live data.
export const dynamic = "force-dynamic";

export type HealthMetricsDay = {
  date: string;
  sleepHours: number | null;
  restingHeartRate: number | null;
  steps: number | null;
};

/** Up to ~6 months of daily history, for the Trends page's graphs. */
const HISTORY_DAYS = 180;

export async function GET(request: NextRequest) {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ days: [] satisfies HealthMetricsDay[] });
  }

  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("health_metrics_daily")
    .select("date, sleep_hours, resting_heart_rate, steps")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(HISTORY_DAYS);

  if (error) {
    console.error("Failed to load health metrics history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  const days: HealthMetricsDay[] = (data ?? []).map((row) => ({
    date: row.date,
    sleepHours: row.sleep_hours,
    restingHeartRate: row.resting_heart_rate,
    steps: row.steps,
  }));

  return NextResponse.json({ days });
}
