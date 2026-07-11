import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";
import { searchLocalNeighborhoods } from "@/lib/localNeighborhoods";

export type GeocodeResult = {
  placeId: number;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  city: string;
  neighborhood: string;
  boundaryGeoJson: unknown | null;
  type: string;
  /** 2024 total population, when the place is a known LA neighbourhood. */
  population?: number;
};

/** Soft-bias boxes for the two metros the user actually lives in, so a bare
 *  neighbourhood name resolves locally instead of to a same-named town in
 *  Denmark or Minnesota. Format: west,north,east,south (lon/lat corners). */
const REGION_VIEWBOX: Record<string, string> = {
  la: "-118.95,34.45,-117.55,33.60",
  nyc: "-74.30,40.95,-73.65,40.48",
};

export async function GET(req: NextRequest) {
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const region = req.nextUrl.searchParams.get("region") ?? "";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");
  // Simplify polygons a touch so a big neighbourhood relation isn't a huge payload.
  url.searchParams.set("polygon_threshold", "0.0008");
  // Both metros are in the US — restricting kills the random overseas matches.
  url.searchParams.set("countrycodes", "us");
  // Prefer results inside the active metro without hard-excluding the other.
  const viewbox = REGION_VIEWBOX[region];
  if (viewbox) {
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("bounded", "0");
  }

  // Curated neighbourhood outlines for the active metro come first — precise,
  // consistent, and always polygonal. OSM fills in everything else (restaurants,
  // other cities) and is only a fallback for neighbourhoods.
  const local = searchLocalNeighborhoods(q, region);

  let data: Array<Record<string, unknown>> = [];
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "LifeTracker/1.0 (junaidrbhatti1@gmail.com)",
        "Accept-Language": "en",
      },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      data = (await res.json()) as Array<Record<string, unknown>>;
    } else if (local.length === 0) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
  } catch (error) {
    // Network hiccup — still serve curated matches if we have them.
    if (local.length === 0) throw error;
  }

  const osmResults: GeocodeResult[] = data.map((r) => {
    const addr = (r.address ?? {}) as Record<string, string>;
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      "";
    const neighborhood =
      addr.neighbourhood ||
      addr.suburb ||
      addr.quarter ||
      addr.district ||
      "";
    const firstName = (r.display_name as string).split(",")[0].trim();
    const geojson = (r.geojson as unknown) ?? null;
    const isPoint =
      !geojson ||
      (geojson as Record<string, string>).type === "Point";

    return {
      placeId: r.place_id as number,
      name: (r.name as string) || firstName,
      displayName: r.display_name as string,
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lon as string),
      city,
      neighborhood,
      boundaryGeoJson: isPoint ? null : geojson,
      type: r.type as string,
    };
  });

  // Drop OSM duplicates of a curated neighbourhood (ours is cleaner), then
  // merge with the curated matches up front.
  const localNames = new Set(local.map((r) => r.name.toLowerCase()));
  const merged = [...local, ...osmResults.filter((r) => !localNames.has(r.name.toLowerCase()))];

  // Rank so the fine, neighbourhood-scale outlines the user actually wants
  // (Highland Park, Silver Lake, Frogtown) beat coarse "sub-city" districts
  // and bare points. Score = has-boundary (most important) + neighbourhood-scale
  // feature type; curated results score highest and stay on top.
  const FINE_TYPES = new Set([
    "neighbourhood",
    "suburb",
    "quarter",
    "city_block",
    "residential",
    "borough",
    "city_district",
  ]);
  const score = (r: GeocodeResult) =>
    (r.boundaryGeoJson ? 2 : 0) + (FINE_TYPES.has((r.type || "").toLowerCase()) ? 1 : 0);
  merged.sort((a, b) => score(b) - score(a));

  return NextResponse.json({ results: merged });
}
