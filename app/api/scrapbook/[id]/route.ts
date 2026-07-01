import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const apiKey = process.env.SCRAPBOOK_API_KEY;
  if (apiKey && request.headers.get("x-scrapbook-key") === apiKey) return true;
  const userId = await userIdFromRequest(request);
  return !!userId;
}

function ownerKey(): string {
  return process.env.OWNER_USER_ID ?? "default";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { id } = await params;
  const patch = await request.json() as Record<string, unknown>;

  const { data, error } = await supabaseAdmin()
    .from("scrap_items")
    .update(patch)
    .eq("id", id)
    .eq("owner", ownerKey())
    .select()
    .single();

  if (error) {
    console.error("scrapbook PATCH error:", error);
    return NextResponse.json({ error: "Failed to update item." }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin()
    .from("scrap_items")
    .delete()
    .eq("id", id)
    .eq("owner", ownerKey());

  if (error) {
    console.error("scrapbook DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
