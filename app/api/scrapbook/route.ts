import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

export type ScrapItemRow = {
  id: string;
  type: "img" | "quote" | "note";
  x: number;
  y: number;
  w: number;
  h?: number | null;
  rot?: number | null;
  label?: string | null;
  text?: string | null;
  source?: string | null;
  url?: string | null;
};

/** Single-user: accepts the owner's Supabase session or the SCRAPBOOK_API_KEY header (for mobile). */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const apiKey = process.env.SCRAPBOOK_API_KEY;
  if (apiKey && request.headers.get("x-scrapbook-key") === apiKey) return true;
  const userId = await userIdFromRequest(request);
  return !!userId;
}

function ownerKey(): string {
  return process.env.OWNER_USER_ID ?? "default";
}

export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ items: [], configured: false });
  }

  const { data, error } = await supabaseAdmin()
    .from("scrap_items")
    .select("id, type, x, y, w, h, rot, label, text, source, url")
    .eq("owner", ownerKey())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("scrapbook GET error:", error);
    return NextResponse.json({ error: "Failed to load scrapbook." }, { status: 500 });
  }

  return NextResponse.json({ items: data as ScrapItemRow[], configured: true });
}

export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const body = await request.json() as Omit<ScrapItemRow, "id"> & { id?: string };
  const id = body.id ?? `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabaseAdmin()
    .from("scrap_items")
    .insert({ ...body, id, owner: ownerKey() })
    .select()
    .single();

  if (error) {
    console.error("scrapbook POST error:", error);
    return NextResponse.json({ error: "Failed to create item." }, { status: 500 });
  }

  return NextResponse.json({ item: data as ScrapItemRow }, { status: 201 });
}
