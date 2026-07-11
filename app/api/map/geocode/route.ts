import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/serverAuth";

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

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "LifeTracker/1.0 (junaidrbhatti1@gmail.com)",
      "Accept-Language": "en",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });

  const data = (await res.json()) as Array<Record<string, unknown>>;

  const results: GeocodeResult[] = data.map((r) => {
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

  // Surface results that carry an actual boundary polygon first — that's what
  // makes a neighbourhood "look at-able with a boundary" — while keeping
  // Nominatim's importance order within each group.
  results.sort((a, b) => Number(!!b.boundaryGeoJson) - Number(!!a.boundaryGeoJson));

  return NextResponse.json({ results });
}
