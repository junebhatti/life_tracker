import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

/** Reports which bank accounts (if any) the user has linked via Plaid. */
export async function GET(request: NextRequest) {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ linked: false, institutions: [] });
  }
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("plaid_items")
    .select("institution_name")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to load Plaid status", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }

  return NextResponse.json({
    linked: (data?.length ?? 0) > 0,
    institutions: (data ?? []).map((row) => row.institution_name ?? "Connected account"),
  });
}
