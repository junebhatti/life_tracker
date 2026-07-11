// Curated neighbourhood boundaries (server-side only) so LA/NYC searches return
// tight, consistent outlines instead of whatever OpenStreetMap happens to have.
// LA set = the L.A. Times "Mapping L.A." boundaries (114 City-of-LA hoods).
// Drop another {city,region,neighborhoods[]} JSON in ./data and register it in
// SETS to add a metro (e.g. NYC neighbourhood tabulation areas).

import laData from "./data/laNeighborhoods.json";
import type { GeocodeResult } from "@/app/api/map/geocode/route";

type LocalHood = { name: string; lat: number; lng: number; geometry: unknown };
type LocalSet = { city: string; region: string; neighborhoods: LocalHood[] };

const SETS: Record<string, LocalSet> = {
  la: laData as LocalSet,
};

/** Common local nicknames that don't match the official dataset name. */
const ALIASES: Record<string, string> = {
  frogtown: "elysian valley",
  "arts district": "downtown",
  losfeliz: "los feliz",
  koreatown: "koreatown",
  "k-town": "koreatown",
  ktown: "koreatown",
  "the valley": "van nuys",
};

/** Deterministic negative id so local results never collide with Nominatim's positive place_ids. */
function localId(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return -Math.abs(h) - 1;
}

/** Fuzzy name match against the curated set for `region`, best matches first. */
export function searchLocalNeighborhoods(query: string, region: string): GeocodeResult[] {
  const set = SETS[region];
  if (!set) return [];
  let q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  q = ALIASES[q] ?? q;

  const scored = set.neighborhoods
    .map((h) => {
      const name = h.name.toLowerCase();
      let s = 0;
      if (name === q) s = 4;
      else if (name.startsWith(q)) s = 3;
      else if (name.includes(q)) s = 2;
      else if (q.length >= 4 && q.includes(name)) s = 1;
      return { h, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.h.name.localeCompare(b.h.name))
    .slice(0, 6);

  return scored.map(({ h }) => ({
    placeId: localId(`${region}:${h.name}`),
    name: h.name,
    displayName: `${h.name}, ${set.city}, CA`,
    lat: h.lat,
    lng: h.lng,
    city: set.city,
    neighborhood: h.name,
    boundaryGeoJson: h.geometry,
    type: "neighbourhood",
  }));
}
