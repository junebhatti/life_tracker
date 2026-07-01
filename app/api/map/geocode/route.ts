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

export async function GET(req: NextRequest) {
  const userId = await userIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");

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

  return NextResponse.json({ results });
}
