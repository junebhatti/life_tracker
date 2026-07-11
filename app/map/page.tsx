"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import type { MapPlace } from "@/app/api/map/places/route";
import type { GeocodeResult } from "@/app/api/map/geocode/route";

const MapCanvas = dynamic(() => import("./MapClient"), { ssr: false });

// ── helpers ──────────────────────────────────────────────────────────────────

/** A neighbourhood is a saved place that carries a boundary polygon; everything
 *  else (restaurants, bars, shops…) is a spot that lives inside one. */
function isNeighborhood(p: MapPlace): boolean {
  return !!p.boundaryGeoJson;
}

/** The neighbourhood name a place belongs to (its own name for a neighbourhood). */
function neighborhoodKey(p: MapPlace): string {
  return (isNeighborhood(p) ? p.neighborhood || p.name : p.neighborhood) || "Other";
}

function groupPlaces(places: MapPlace[]) {
  const cities = new Map<string, Map<string, MapPlace[]>>();
  for (const p of places) {
    if (!cities.has(p.city)) cities.set(p.city, new Map());
    const nb = neighborhoodKey(p);
    const city = cities.get(p.city)!;
    if (!city.has(nb)) city.set(nb, []);
    city.get(nb)!.push(p);
  }
  return cities;
}

function authHeaders(token: string | undefined): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** "fast_food" -> "Fast food" for the little result-type hint. */
function prettyType(type: string): string {
  if (!type) return "Place";
  const s = type.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Guess which metro to bias search toward from a city label. */
function regionForCity(city: string): "la" | "nyc" {
  const c = city.toLowerCase();
  const nyc = ["new york", "nyc", "brooklyn", "queens", "bronx", "manhattan", "staten"];
  return nyc.some((n) => c.includes(n)) ? "nyc" : "la";
}

// ── geocoder search hook ──────────────────────────────────────────────────────

function useGeocode(query: string, region: string, token: string | undefined) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/map/geocode?q=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}`,
          { headers: authHeaders(token) },
        );
        if (res.ok) {
          const json = await res.json() as { results: GeocodeResult[] };
          setResults(json.results);
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query, region, token]);

  return { results, searching };
}

// ── component ────────────────────────────────────────────────────────────────

type PanelMode = "none" | "add" | "edit" | "detail" | "neighborhood";

export default function MapPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [panel, setPanel] = useState<PanelMode>("none");
  // When adding, the neighbourhood the new spot is being dropped into (set from
  // a neighbourhood's "+ Add spot"; null for the top-level "+ Add").
  const [addFixed, setAddFixed] = useState<string | null>(null);

  // ── fetch ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/map/places", { headers: authHeaders(token) });
    if (!res.ok) return;
    const json = await res.json() as { places: MapPlace[] };
    setPlaces(json.places);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── grouped nav ───────────────────────────────────────────────────────────

  const grouped = useMemo(() => groupPlaces(places), [places]);
  const cityNames = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  const activeCity = selectedCity ?? cityNames[0] ?? null;
  // null → show every place in the city; a name → filter to that neighbourhood.
  const activeNeighborhood = selectedNeighborhood;

  const visiblePlaces = useMemo(() => {
    if (!activeCity) return places;
    const cityMap = grouped.get(activeCity);
    if (!cityMap) return [];
    if (!activeNeighborhood) return Array.from(cityMap.values()).flat();
    return cityMap.get(activeNeighborhood) ?? [];
  }, [places, grouped, activeCity, activeNeighborhood]);

  // The boundary place + the spots that make up the currently open neighbourhood.
  const neighborhoodPlace = useMemo(
    () =>
      activeNeighborhood
        ? visiblePlaces.find((p) => isNeighborhood(p) && neighborhoodKey(p) === activeNeighborhood)
        : undefined,
    [visiblePlaces, activeNeighborhood],
  );
  const neighborhoodSpots = useMemo(
    () => visiblePlaces.filter((p) => !isNeighborhood(p)),
    [visiblePlaces],
  );

  function selectCity(city: string) {
    setSelectedCity(city);
    setSelectedNeighborhood(null);
    setSelectedPlace(null);
    setPanel("none");
  }

  function selectNeighborhood(nb: string) {
    setSelectedNeighborhood(nb);
    setSelectedPlace(null);
    setPanel("neighborhood");
  }

  /** Clicking a pin/polygon: a neighbourhood opens its container panel, a spot its detail. */
  function handleSelect(p: MapPlace) {
    if (isNeighborhood(p)) {
      setSelectedCity(p.city);
      setSelectedNeighborhood(neighborhoodKey(p));
      setSelectedPlace(p);
      setPanel("neighborhood");
    } else {
      setSelectedPlace(p);
      setPanel("detail");
    }
  }

  // ── writes ──────────────────────────────────────────────────────────────────

  type SavePayload = {
    name: string;
    officialName?: string;
    city: string;
    neighborhood?: string;
    lat: number;
    lng: number;
    notes: string;
    visitedAt?: string;
    boundaryGeoJson?: unknown;
  };

  /** Ensures the neighbourhood a spot belongs to exists as a boundary place —
   *  looking its outline up from the geocoder — before the spot is saved. */
  const ensureNeighborhood = useCallback(
    async (name: string, city: string) => {
      const already = places.some(
        (p) => p.city === city && isNeighborhood(p) && neighborhoodKey(p) === name,
      );
      if (already) return;
      const region = regionForCity(city);
      const res = await fetch(
        `/api/map/geocode?q=${encodeURIComponent(name)}&region=${encodeURIComponent(region)}`,
        { headers: authHeaders(token) },
      );
      if (!res.ok) return;
      const { results } = (await res.json()) as { results: GeocodeResult[] };
      const boundary = results.find((r) => r.boundaryGeoJson);
      if (!boundary) return;
      await fetch("/api/map/places", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          name: boundary.name,
          officialName: boundary.name !== name ? boundary.name : undefined,
          city,
          neighborhood: name,
          lat: boundary.lat,
          lng: boundary.lng,
          notes: "",
          boundaryGeoJson: boundary.boundaryGeoJson,
        }),
      });
    },
    [places, token],
  );

  const savePlace = useCallback(
    async (payload: SavePayload) => {
      // A spot with a neighbourhood we don't have yet → create the neighbourhood first.
      if (!payload.boundaryGeoJson && payload.neighborhood) {
        await ensureNeighborhood(payload.neighborhood, payload.city);
      }
      const res = await fetch("/api/map/places", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(payload),
      });
      if (res.ok) await load();
    },
    [ensureNeighborhood, token, load],
  );

  const saveNotes = useCallback(
    async (id: string, notes: string) => {
      await fetch(`/api/map/places/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ notes }),
      });
      await load();
    },
    [token, load],
  );

  async function handleDelete(id: string) {
    await fetch(`/api/map/places/${id}`, { method: "DELETE", headers: authHeaders(token) });
    setSelectedPlace(null);
    setPanel(activeNeighborhood ? "neighborhood" : "none");
    load();
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* city / neighbourhood nav */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">World</p>
            <h2 className="text-base font-semibold text-foreground">Map</h2>
          </div>
          <button
            type="button"
            onClick={() => { setAddFixed(null); setSelectedPlace(null); setPanel("add"); }}
            className="rounded-md bg-[#2323e8] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white hover:bg-[#1c1cba]"
          >
            + Add
          </button>
        </div>

        {loading && (
          <div className="px-4 pt-4 flex flex-col gap-2">
            {[0,1,2,3].map((i) => <div key={i} className="h-6 rounded bg-hover animate-pulse" />)}
          </div>
        )}

        {!loading && cityNames.length === 0 && (
          <p className="px-4 text-[11px] text-muted leading-snug">
            No places yet — search for one to add your first pin.
          </p>
        )}

        {!loading && cityNames.map((city) => {
          const isActive = city === activeCity;
          const cityNbs = Array.from(grouped.get(city)?.keys() ?? []).sort();
          return (
            <div key={city}>
              <button
                type="button"
                onClick={() => selectCity(city)}
                className={`w-full px-4 py-2 text-left text-[13px] font-medium transition-colors ${
                  isActive ? "bg-hover text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {city}
              </button>
              {isActive && (
                <button
                  type="button"
                  onClick={() => { setSelectedNeighborhood(null); setSelectedPlace(null); setPanel("none"); }}
                  className={`w-full px-6 py-1.5 text-left text-[12px] transition-colors ${
                    activeNeighborhood === null ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  All neighborhoods
                </button>
              )}
              {isActive && cityNbs.map((nb) => (
                <button
                  key={nb}
                  type="button"
                  onClick={() => selectNeighborhood(nb)}
                  className={`w-full px-6 py-1.5 text-left text-[12px] transition-colors ${
                    nb === activeNeighborhood ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {nb}
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* map + right panel */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 h-full">
          <MapCanvas
            places={visiblePlaces}
            selected={selectedPlace}
            fitKey={`${activeCity ?? "all"}::${activeNeighborhood ?? "all"}::${visiblePlaces.length}`}
            onSelect={handleSelect}
          />
        </div>

        {panel === "neighborhood" && activeNeighborhood && (
          <NeighborhoodPanel
            name={activeNeighborhood}
            city={activeCity ?? ""}
            place={neighborhoodPlace}
            spots={neighborhoodSpots}
            onSelectSpot={(p) => { setSelectedPlace(p); setPanel("detail"); }}
            onAddSpot={() => { setAddFixed(activeNeighborhood); setSelectedPlace(null); setPanel("add"); }}
            onEdit={() => { if (neighborhoodPlace) { setSelectedPlace(neighborhoodPlace); setPanel("edit"); } }}
            onSaveNotes={(notes) => { if (neighborhoodPlace) saveNotes(neighborhoodPlace.id, notes); }}
            onClose={() => setPanel("none")}
          />
        )}

        {panel === "detail" && selectedPlace && (
          <DetailPanel
            place={selectedPlace}
            onClose={() => setPanel(activeNeighborhood ? "neighborhood" : "none")}
            onEdit={() => setPanel("edit")}
            onSaveNotes={(notes) => saveNotes(selectedPlace.id, notes)}
            onDelete={(id) => {
              if (confirm(`Delete "${selectedPlace.name}"?`)) handleDelete(id);
            }}
          />
        )}

        {panel === "add" && (
          <GeocoderPanel
            title={addFixed ? `Add a spot in ${addFixed}` : "Add Place"}
            defaultCity={activeCity ?? ""}
            fixedNeighborhood={addFixed ?? undefined}
            token={token}
            onClose={() => setPanel(addFixed ? "neighborhood" : "none")}
            onSave={async (payload) => {
              await savePlace(payload);
              setPanel(addFixed ? "neighborhood" : "none");
            }}
          />
        )}

        {panel === "edit" && selectedPlace && (
          <GeocoderPanel
            title="Edit Place"
            defaultCity={selectedPlace.city}
            initial={selectedPlace}
            token={token}
            onClose={() => setPanel(isNeighborhood(selectedPlace) ? "neighborhood" : "detail")}
            onSave={async (payload) => {
              await fetch(`/api/map/places/${selectedPlace.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders(token) },
                body: JSON.stringify(payload),
              });
              setPanel(isNeighborhood(selectedPlace) ? "neighborhood" : "none");
              if (!isNeighborhood(selectedPlace)) setSelectedPlace(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── inline notes editor (shared by neighbourhood + spot panels) ────────────────

function NotesBlock({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  // Re-sync the draft if the saved notes change underneath us (React's
  // adjust-state-during-render pattern — no effect needed).
  const [seenNotes, setSeenNotes] = useState(notes);
  if (seenNotes !== notes) {
    setSeenNotes(notes);
    setDraft(notes);
  }

  if (editing) {
    return (
      <div className="mt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Write notes…"
          className="w-full rounded-md border border-border p-3 text-sm leading-relaxed text-foreground outline-none focus:border-neutral-400"
        />
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={() => { onSave(draft.trim()); setEditing(false); }} className="text-[11px] font-medium uppercase tracking-wider text-[#2323e8]">
            Save
          </button>
          <button type="button" onClick={() => { setDraft(notes); setEditing(false); }} className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {notes ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{notes}</p>
      ) : (
        <p className="text-sm italic text-muted">No notes yet.</p>
      )}
      <button type="button" onClick={() => setEditing(true)} className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted hover:text-foreground">
        {notes ? "Edit notes" : "Add notes"}
      </button>
    </div>
  );
}

// ── neighbourhood panel (container: notes + spots) ─────────────────────────────

function NeighborhoodPanel({
  name,
  city,
  place,
  spots,
  onSelectSpot,
  onAddSpot,
  onEdit,
  onSaveNotes,
  onClose,
}: {
  name: string;
  city: string;
  place: MapPlace | undefined;
  spots: MapPlace[];
  onSelectSpot: (p: MapPlace) => void;
  onAddSpot: () => void;
  onEdit: () => void;
  onSaveNotes: (notes: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">{city} · Neighborhood</p>
            <h3 className="mt-0.5 text-lg font-semibold leading-tight text-foreground">{name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-muted hover:text-foreground">×</button>
        </div>

        {place ? (
          <NotesBlock notes={place.notes} onSave={onSaveNotes} />
        ) : (
          <p className="mt-4 text-xs text-muted">
            Add a spot here and this neighborhood&apos;s outline will be pulled in automatically.
          </p>
        )}

        {place && (
          <button type="button" onClick={onEdit} className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted hover:text-foreground">
            Edit neighborhood
          </button>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Spots · {spots.length}
          </p>
          <button
            type="button"
            onClick={onAddSpot}
            className="rounded-md bg-[#2323e8] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white hover:bg-[#1c1cba]"
          >
            + Add spot
          </button>
        </div>

        <div className="mt-2 flex flex-col">
          {spots.length === 0 && <p className="py-3 text-sm italic text-muted">No spots yet.</p>}
          {spots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSpot(s)}
              className="border-b border-border py-2.5 text-left hover:bg-hover"
            >
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              {s.notes && <p className="mt-0.5 truncate text-[11px] text-muted">{s.notes}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── detail panel (a single spot) ───────────────────────────────────────────────

function DetailPanel({
  place,
  onClose,
  onEdit,
  onSaveNotes,
  onDelete,
}: {
  place: MapPlace;
  onClose: () => void;
  onEdit: () => void;
  onSaveNotes: (notes: string) => void;
  onDelete: (id: string) => void;
}) {
  const showOfficial = place.officialName && place.officialName !== place.name;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {place.city}{place.neighborhood ? ` · ${place.neighborhood}` : ""}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-foreground leading-tight">{place.name}</h3>
            {showOfficial && (
              <p className="mt-0.5 text-[11px] text-muted">{place.officialName}</p>
            )}
            {place.visitedAt && (
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                Visited {new Date(place.visitedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">×</button>
        </div>

        <NotesBlock notes={place.notes} onSave={onSaveNotes} />

        {place.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {place.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="rounded-md object-cover aspect-square w-full" />
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-md border border-border py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground hover:bg-hover"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(place.id)}
            className="flex-1 rounded-md border border-red-200 py-1.5 text-[11px] font-medium uppercase tracking-wider text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── geocoder panel ────────────────────────────────────────────────────────────

type SavePayload = {
  name: string;
  officialName?: string;
  city: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  notes: string;
  visitedAt?: string;
  boundaryGeoJson?: unknown;
};

type Picked = {
  officialName: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  boundaryGeoJson: unknown | null;
};

function GeocoderPanel({
  title,
  defaultCity,
  initial,
  fixedNeighborhood,
  token,
  onClose,
  onSave,
}: {
  title: string;
  defaultCity: string;
  initial?: MapPlace;
  /** When set, the panel is adding a spot inside this neighbourhood; the saved
   *  place is forced into it regardless of what the geocoder guesses. */
  fixedNeighborhood?: string;
  token: string | undefined;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [region, setRegion] = useState<"la" | "nyc">(regionForCity(defaultCity));
  const { results, searching } = useGeocode(query, region, token);

  const [picked, setPicked] = useState<Picked | null>(
    initial
      ? {
          officialName: initial.officialName ?? initial.name,
          city: initial.city,
          neighborhood: initial.neighborhood ?? "",
          lat: initial.lat,
          lng: initial.lng,
          boundaryGeoJson: initial.boundaryGeoJson ?? null,
        }
      : null,
  );

  const [customName, setCustomName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [visitedAt, setVisitedAt] = useState(initial?.visitedAt ?? "");
  const [saving, setSaving] = useState(false);

  function selectResult(r: GeocodeResult) {
    const city = fixedNeighborhood ? defaultCity : r.city || defaultCity;
    setPicked({
      officialName: r.name,
      city,
      neighborhood: fixedNeighborhood ?? r.neighborhood,
      lat: r.lat,
      lng: r.lng,
      boundaryGeoJson: r.boundaryGeoJson,
    });
    setCustomName(r.name);
    setQuery("");
    setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    const displayName = customName.trim() || picked.officialName;
    setSaving(true);
    await onSave({
      name: displayName,
      officialName: picked.officialName !== displayName ? picked.officialName : undefined,
      city: picked.city,
      neighborhood: (fixedNeighborhood ?? picked.neighborhood) || undefined,
      lat: picked.lat,
      lng: picked.lng,
      notes,
      visitedAt: visitedAt || undefined,
      boundaryGeoJson: picked.boundaryGeoJson ?? undefined,
    });
    setSaving(false);
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">×</button>
        </div>

        {/* search */}
        <div className="relative mb-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-muted">
              {fixedNeighborhood ? "Search for a spot" : "Search for a place"}
            </label>
            <div className="flex overflow-hidden rounded-md border border-border">
              {(["la", "nyc"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    region === r ? "bg-[#2323e8] text-white" : "text-muted hover:bg-hover"
                  }`}
                >
                  {r === "la" ? "LA" : "NYC"}
                </button>
              ))}
            </div>
          </div>
          <input
            className={inputCls}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            placeholder={fixedNeighborhood ? "a restaurant, bar, cafe…" : "Night + Market  ·  Silver Lake"}
            autoComplete="off"
          />
          {searching && (
            <p className="mt-1 text-[11px] text-muted">Searching...</p>
          )}
          {showResults && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-md shadow-md z-10 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <li key={`${r.placeId}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={() => selectResult(r)}
                    className="w-full px-3 py-2 text-left hover:bg-hover"
                  >
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-[11px] text-muted truncate">{r.displayName}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider">
                      {r.boundaryGeoJson ? (
                        <span className="text-[#2323e8]">includes boundary</span>
                      ) : (
                        <span className="text-muted">{prettyType(r.type)}</span>
                      )}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {picked && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* location summary badge */}
            <div className="rounded-md bg-neutral-50 border border-border px-3 py-2 text-[12px] text-foreground leading-snug">
              <span className="font-medium">{picked.city}</span>
              {(fixedNeighborhood || picked.neighborhood) && <> · {fixedNeighborhood ?? picked.neighborhood}</>}
              {!!picked.boundaryGeoJson && (
                <span className="ml-2 text-[#2323e8]">· boundary</span>
              )}
              {!picked.boundaryGeoJson && (
                <span className="ml-2 text-neutral-400">· spot</span>
              )}
            </div>

            <Field label="Your name">
              <input
                className={inputCls}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={picked.officialName}
              />
              {picked.officialName !== customName.trim() && customName.trim() && (
                <p className="mt-0.5 text-[10px] text-muted">
                  Official: {picked.officialName}
                </p>
              )}
            </Field>

            <Field label="Notes">
              <textarea
                className={`${inputCls} resize-none`}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Great tacos, cash only..."
              />
            </Field>

            <Field label="Visited date">
              <input
                className={inputCls}
                type="date"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
              />
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-md bg-[#2323e8] py-2 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-[#1c1cba] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Pin"}
            </button>
          </form>
        )}

        {!picked && (
          <p className="text-[12px] text-muted leading-relaxed">
            Search above and select a result — coordinates and boundary are filled automatically.
          </p>
        )}
      </div>
    </div>
  );
}

// ── shared ────────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
