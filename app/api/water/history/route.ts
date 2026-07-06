import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

// Never statically cache this route — it's always freshly fetched live data.
export const dynamic = "force-dynamic";

export type WaterHistoryDay = {
  date: string;
  totalMl: number;
};

/** Up to ~6 months of daily totals, for building your own graphs from the raw log data. */
const HISTORY_DAYS = 180;

export async function GET(request: NextRequest) {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ days: [] satisfies WaterHistoryDay[] });
  }

  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabaseAdmin()
    .from("water_logs")
    .select("amount_ml, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", since)
    .order("logged_at", { ascending: true });

  if (error) {
    console.error("Failed to load water history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  // Bucket individual log entries into daily totals (each glass is its own
  // row; a day's total is the sum of everything logged that civil day).
  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const day = String(row.logged_at).slice(0, 10);
    totals.set(day, (totals.get(day) ?? 0) + Number(row.amount_ml));
  }

  const days: WaterHistoryDay[] = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalMl]) => ({ date, totalMl: Math.round(totalMl) }));

  return NextResponse.json({ days });
}
