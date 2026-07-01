import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

export type MapPlace = {
  id: string;
  name: string;
  city: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  notes: string;
  images: string[];
  visitedAt?: string;
  createdAt: string;
};

function guard() {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const g = guard();
  if (g) return g;
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const city = req.nextUrl.searchParams.get("city");
  let query = supabaseAdmin()
    .from("map_places")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (city) query = query.eq("city", city);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const places: MapPlace[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    neighborhood: r.neighborhood ?? undefined,
    lat: r.lat,
    lng: r.lng,
    notes: r.notes,
    images: Array.isArray(r.images) ? r.images : [],
    visitedAt: r.visited_at ?? undefined,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ places });
}

export async function POST(req: NextRequest) {
  const g = guard();
  if (g) return g;
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<MapPlace>;
  if (!body.name || !body.city || body.lat === undefined || body.lng === undefined) {
    return NextResponse.json({ error: "name, city, lat, lng required" }, { status: 400 });
  }

  const id = `place_${Date.now()}`;
  const { error } = await supabaseAdmin()
    .from("map_places")
    .insert({
      id,
      user_id: userId,
      name: body.name,
      city: body.city,
      neighborhood: body.neighborhood ?? null,
      lat: body.lat,
      lng: body.lng,
      notes: body.notes ?? "",
      images: body.images ?? [],
      visited_at: body.visitedAt ?? null,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id }, { status: 201 });
}
