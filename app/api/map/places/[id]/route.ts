import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

function guard() {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = guard();
  if (g) return g;
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.officialName !== undefined) patch.official_name = body.officialName;
  if (body.city !== undefined) patch.city = body.city;
  if (body.neighborhood !== undefined) patch.neighborhood = body.neighborhood;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.images !== undefined) patch.images = body.images;
  if (body.visitedAt !== undefined) patch.visited_at = body.visitedAt;
  if (body.boundaryGeoJson !== undefined) patch.boundary_geojson = body.boundaryGeoJson;

  const { error } = await supabaseAdmin()
    .from("map_places")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = guard();
  if (g) return g;
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin()
    .from("map_places")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
