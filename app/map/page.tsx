"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import type { MapPlace } from "@/app/api/map/places/route";
import type { GeocodeResult } from "@/app/api/map/geocode/route";

const MapCanvas = dynamic(() => import("./MapClient"), { ssr: false });

// ── helpers ──────────────────────────────────────────────────────────────────

function groupPlaces(places: MapPlace[]) {
  const cities = new Map<string, Map<string, MapPlace[]>>();
  for (const p of places) {
    if (!cities.has(p.city)) cities.set(p.city, new Map());
    const nb = p.neighborhood ?? "Other";
    const city = cities.get(p.city)!;
    if (!city.has(nb)) city.set(nb, []);
    city.get(nb)!.push(p);
  }
  return cities;
}

// ── geocoder search hook ──────────────────────────────────────────────────────

function useGeocode(query: string) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/map/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const json = await res.json() as { results: GeocodeResult[] };
          setResults(json.results);
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  return { results, searching };
}

// ── component ────────────────────────────────────────────────────────────────

type PanelMode = "none" | "add" | "edit" | "detail";

export default function MapPage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [panel, setPanel] = useState<PanelMode>("none");

  // ── fetch ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const res = await fetch("/api/map/places");
    if (!res.ok) return;
    const json = await res.json() as { places: MapPlace[] };
    setPlaces(json.places);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── grouped nav ───────────────────────────────────────────────────────────

  const grouped = useMemo(() => groupPlaces(places), [places]);
  const cityNames = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  const activeCity = selectedCity ?? cityNames[0] ?? null;
  const neighborhoods = useMemo(() => {
    if (!activeCity) return [];
    return Array.from(grouped.get(activeCity)?.keys() ?? []).sort();
  }, [grouped, activeCity]);
  const activeNeighborhood = selectedNeighborhood ?? neighborhoods[0] ?? null;

  const visiblePlaces = useMemo(() => {
    if (!activeCity) return places;
    const cityMap = grouped.get(activeCity);
    if (!cityMap) return [];
    if (!activeNeighborhood) return Array.from(cityMap.values()).flat();
    return cityMap.get(activeNeighborhood) ?? [];
  }, [places, grouped, activeCity, activeNeighborhood]);

  function selectCity(city: string) {
    setSelectedCity(city);
    setSelectedNeighborhood(null);
    setSelectedPlace(null);
    setPanel("none");
  }

  function selectNeighborhood(nb: string) {
    setSelectedNeighborhood(nb);
    setSelectedPlace(null);
    setPanel("none");
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await fetch(`/api/map/places/${id}`, { method: "DELETE" });
    setSelectedPlace(null);
    setPanel("none");
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
            onClick={() => { setPanel("add"); setSelectedPlace(null); }}
            className="rounded-md bg-neutral-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white hover:bg-neutral-700"
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
              {isActive && cityNbs.map((nb) => (
                <button
                  key={nb}
                  type="button"
                  onClick={() => selectNeighborhood(nb)}
                  className={`w-full px-6 py-1.5 text-left text-[12px] transition-colors ${
                    nb === activeNeighborhood ? "text-foreground" : "text-muted hover:text-foreground"
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
            onSelect={(p) => { setSelectedPlace(p); setPanel("detail"); }}
          />
        </div>

        {/* detail panel */}
        {panel === "detail" && selectedPlace && (
          <DetailPanel
            place={selectedPlace}
            onClose={() => setPanel("none")}
            onEdit={() => setPanel("edit")}
            onDelete={(id) => {
              if (confirm(`Delete "${selectedPlace.name}"?`)) handleDelete(id);
            }}
          />
        )}

        {/* add panel */}
        {panel === "add" && (
          <GeocoderPanel
            title="Add Place"
            defaultCity={activeCity ?? ""}
            onClose={() => setPanel("none")}
            onSave={async (payload) => {
              const res = await fetch("/api/map/places", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (res.ok) { setPanel("none"); load(); }
            }}
          />
        )}

        {/* edit panel */}
        {panel === "edit" && selectedPlace && (
          <GeocoderPanel
            title="Edit Place"
            defaultCity={selectedPlace.city}
            initial={selectedPlace}
            onClose={() => setPanel("detail")}
            onSave={async (payload) => {
              await fetch(`/api/map/places/${selectedPlace.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              setPanel("none");
              setSelectedPlace(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  place,
  onClose,
  onEdit,
  onDelete,
}: {
  place: MapPlace;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {place.city}{place.neighborhood ? ` · ${place.neighborhood}` : ""}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-foreground leading-tight">{place.name}</h3>
            {place.visitedAt && (
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                Visited {new Date(place.visitedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">×</button>
        </div>

        {place.notes && (
          <p className="mt-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{place.notes}</p>
        )}

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
  city: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  notes: string;
  visitedAt?: string;
  boundaryGeoJson?: unknown;
};

function GeocoderPanel({
  title,
  defaultCity,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  defaultCity: string;
  initial?: MapPlace;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
}) {
  // search state
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { results, searching } = useGeocode(query);

  // chosen place state
  const [picked, setPicked] = useState<{
    name: string;
    city: string;
    neighborhood: string;
    lat: number;
    lng: number;
    boundaryGeoJson: unknown | null;
  } | null>(
    initial
      ? {
          name: initial.name,
          city: initial.city,
          neighborhood: initial.neighborhood ?? "",
          lat: initial.lat,
          lng: initial.lng,
          boundaryGeoJson: initial.boundaryGeoJson ?? null,
        }
      : null,
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [visitedAt, setVisitedAt] = useState(initial?.visitedAt ?? "");
  const [saving, setSaving] = useState(false);

  function selectResult(r: GeocodeResult) {
    const city = r.city || defaultCity;
    setPicked({ name: r.name, city, neighborhood: r.neighborhood, lat: r.lat, lng: r.lng, boundaryGeoJson: r.boundaryGeoJson });
    setName(r.name);
    setQuery("");
    setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked || !name) return;
    setSaving(true);
    await onSave({
      name,
      city: picked.city,
      neighborhood: picked.neighborhood || undefined,
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
          <label className="block text-[10px] font-medium uppercase tracking-wider text-muted mb-1">
            Search for a place
          </label>
          <input
            className={inputCls}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="e.g. Frogtown, LA  or  Cosa Nostra restaurant"
            autoComplete="off"
          />
          {searching && (
            <p className="mt-1 text-[11px] text-muted">Searching…</p>
          )}
          {showResults && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-md shadow-md z-10 max-h-64 overflow-y-auto">
              {results.map((r) => (
                <li key={r.placeId}>
                  <button
                    type="button"
                    onMouseDown={() => selectResult(r)}
                    className="w-full px-3 py-2 text-left hover:bg-hover"
                  >
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-[11px] text-muted truncate">{r.displayName}</p>
                    {!!r.boundaryGeoJson && (
                      <p className="text-[10px] text-orange-600 uppercase tracking-wider mt-0.5">includes boundary</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* filled details after picking */}
        {picked && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="rounded-md bg-neutral-50 border border-border px-3 py-2 text-[12px] text-foreground leading-snug">
              <span className="font-medium">{picked.city}</span>
              {picked.neighborhood && <> · {picked.neighborhood}</>}
              <span className="text-muted ml-2">({picked.lat.toFixed(4)}, {picked.lng.toFixed(4)})</span>
              {!!picked.boundaryGeoJson && (
                <span className="ml-2 text-orange-600">boundary</span>
              )}
            </div>

            <Field label="Label">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Custom name…"
                required
              />
            </Field>

            <Field label="Notes">
              <textarea
                className={`${inputCls} resize-none`}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Great tacos, cash only…"
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
              className="mt-1 rounded-md bg-neutral-800 py-2 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Pin"}
            </button>
          </form>
        )}

        {!picked && (
          <p className="text-[12px] text-muted leading-relaxed">
            Search above and select a result — coordinates and boundary are auto-filled.
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
