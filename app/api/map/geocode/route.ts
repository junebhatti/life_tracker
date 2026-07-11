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
};

/** Soft-bias boxes + centers for the two metros the user lives in, so a bare
 *  place name resolves locally instead of to a same-named spot in Denmark. */
const REGION = {
  la: { viewbox: "-118.95,34.45,-117.55,33.60", lat: 34.05, lon: -118.24 },
  nyc: { viewbox: "-74.30,40.95,-73.65,40.48", lat: 40.71, lon: -74.0 },
} as const;

const UA = "LifeTracker/1.0 (junaidrbhatti1@gmail.com)";

/** Nominatim — strong for areas/boundaries (neighbourhoods, parks), US-restricted. */
async function fetchNominatim(q: string, region: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("polygon_threshold", "0.0008");
  url.searchParams.set("countrycodes", "us");
  const box = REGION[region as keyof typeof REGION];
  if (box) {
    url.searchParams.set("viewbox", box.viewbox);
    url.searchParams.set("bounded", "0");
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;

  return data.map((r) => {
    const addr = (r.address ?? {}) as Record<string, string>;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.district || "";
    const firstName = (r.display_name as string).split(",")[0].trim();
    const geojson = (r.geojson as unknown) ?? null;
    const isPoint = !geojson || (geojson as Record<string, string>).type === "Point";
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
}

/** Photon (komoot, OSM-based) — built for type-ahead POI/business search with
 *  location bias, which is exactly what Nominatim is weak at. Points only. */
async function fetchPhoton(q: string, region: string): Promise<GeocodeResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "10");
  url.searchParams.set("lang", "en");
  const center = REGION[region as keyof typeof REGION];
  if (center) {
    url.searchParams.set("lat", String(center.lat));
    url.searchParams.set("lon", String(center.lon));
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = (await res.json()) as { features?: Array<Record<string, unknown>> };

  const out: GeocodeResult[] = [];
  for (const f of json.features ?? []) {
    const geom = f.geometry as { coordinates?: [number, number] } | undefined;
    const p = (f.properties ?? {}) as Record<string, string | number>;
    const coords = geom?.coordinates;
    if (!coords || typeof coords[0] !== "number" || typeof coords[1] !== "number") continue;
    // Keep it to US so a business query can't wander overseas.
    if (p.countrycode && String(p.countrycode).toUpperCase() !== "US") continue;

    const name =
      (p.name as string) ||
      [p.housenumber, p.street].filter(Boolean).join(" ") ||
      (p.osm_value as string) ||
      "Unnamed place";
    const city = String(p.city || p.town || p.village || p.county || "");
    const neighborhood = String(p.district || p.suburb || p.neighbourhood || p.locality || "");
    const displayName =
      [p.name, p.street, p.district || p.suburb, p.city, p.state]
        .filter(Boolean)
        .join(", ") || name;

    out.push({
      placeId: typeof p.osm_id === "number" ? p.osm_id : Date.now() + out.length,
      name,
      displayName,
      lat: coords[1],
      lng: coords[0],
      city,
      neighborhood,
      boundaryGeoJson: null,
      type: String(p.osm_value || p.osm_key || "poi"),
    });
  }
  return out;
}

const FINE_TYPES = new Set([
  "neighbourhood", "suburb", "quarter", "city_block", "residential", "borough", "city_district",
]);

/** Curated + boundary + neighbourhood-scale results rank first; POIs follow. */
function score(r: GeocodeResult): number {
  return (r.boundaryGeoJson ? 2 : 0) + (FINE_TYPES.has((r.type || "").toLowerCase()) ? 1 : 0);
}

export async function GET(req: NextRequest) {
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const region = req.nextUrl.searchParams.get("region") ?? "";

  // Curated neighbourhood outlines come first; the two OSM geocoders (areas +
  // POIs) run in parallel and either failing is non-fatal.
  const local = searchLocalNeighborhoods(q, region);
  const [nominatim, photon] = await Promise.all([
    fetchNominatim(q, region).catch(() => [] as GeocodeResult[]),
    fetchPhoton(q, region).catch(() => [] as GeocodeResult[]),
  ]);

  if (local.length === 0 && nominatim.length === 0 && photon.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Merge in priority order, then drop near-duplicates (same name + roughly the
  // same spot) keeping the higher-priority/boundary-bearing copy.
  const merged: GeocodeResult[] = [];
  const seen = new Set<string>();
  for (const r of [...local, ...nominatim, ...photon]) {
    const key = `${r.name.toLowerCase()}|${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }

  // Stable sort by score so curated/boundary results stay on top while each
  // provider's own relevance order is preserved within a tie.
  const ranked = merged
    .map((r, i) => ({ r, i }))
    .sort((a, b) => score(b.r) - score(a.r) || a.i - b.i)
    .map((x) => x.r)
    .slice(0, 12);

  return NextResponse.json({ results: ranked });
}
