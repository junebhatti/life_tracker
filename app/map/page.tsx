"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import type { MapPlace } from "@/app/api/map/places/route";

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

const EMPTY_FORM = {
  name: "",
  city: "",
  neighborhood: "",
  lat: "",
  lng: "",
  notes: "",
  visitedAt: "",
};

// ── component ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editingPlace, setEditingPlace] = useState<MapPlace | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  // ── fetch ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const res = await fetch("/api/map/places");
    if (!res.ok) return;
    const json = await res.json() as { places: MapPlace[] };
    setPlaces(json.places);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── grouped view ─────────────────────────────────────────────────────────

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

  // ── city/neighborhood selection resets ───────────────────────────────────

  function selectCity(city: string) {
    setSelectedCity(city);
    setSelectedNeighborhood(null);
    setSelectedPlace(null);
  }

  function selectNeighborhood(nb: string) {
    setSelectedNeighborhood(nb);
    setSelectedPlace(null);
  }

  // ── add place ────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.name || !form.city || isNaN(lat) || isNaN(lng)) return;
    setSaving(true);
    const res = await fetch("/api/map/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        city: form.city,
        neighborhood: form.neighborhood || undefined,
        lat,
        lng,
        notes: form.notes,
        visitedAt: form.visitedAt || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowAdd(false);
      load();
    }
  }

  // ── edit place ───────────────────────────────────────────────────────────

  function openEdit(p: MapPlace) {
    setEditingPlace(p);
    setEditForm({
      name: p.name,
      city: p.city,
      neighborhood: p.neighborhood ?? "",
      lat: String(p.lat),
      lng: String(p.lng),
      notes: p.notes,
      visitedAt: p.visitedAt ?? "",
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlace) return;
    const lat = parseFloat(editForm.lat);
    const lng = parseFloat(editForm.lng);
    setSaving(true);
    await fetch(`/api/map/places/${editingPlace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        city: editForm.city,
        neighborhood: editForm.neighborhood || undefined,
        lat,
        lng,
        notes: editForm.notes,
        visitedAt: editForm.visitedAt || undefined,
      }),
    });
    setSaving(false);
    setEditingPlace(null);
    setSelectedPlace(null);
    load();
  }

  // ── delete place ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await fetch(`/api/map/places/${id}`, { method: "DELETE" });
    setSelectedPlace(null);
    load();
  }

  // ── render ───────────────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* ── city/neighborhood nav ─────────────────────────────────────────── */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              World
            </p>
            <h2 className="text-base font-semibold text-foreground">Map</h2>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setEditingPlace(null); setSelectedPlace(null); }}
            className="rounded-md bg-neutral-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white hover:bg-neutral-700"
          >
            + Add
          </button>
        </div>

        {loading && (
          <div className="px-4 pt-4 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-hover animate-pulse" />
            ))}
          </div>
        )}

        {!loading && cityNames.length === 0 && (
          <p className="px-4 text-[11px] text-muted">
            No places yet. Add your first pin!
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
                  isActive
                    ? "bg-hover text-foreground"
                    : "text-muted hover:text-foreground"
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
                    nb === activeNeighborhood
                      ? "text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {nb}
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* ── map + detail ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* map */}
        <div className="flex-1 h-full">
          <MapCanvas
            places={visiblePlaces}
            selected={selectedPlace}
            onSelect={setSelectedPlace}
          />
        </div>

        {/* place detail panel */}
        {selectedPlace && !editingPlace && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    {selectedPlace.city}
                    {selectedPlace.neighborhood ? ` · ${selectedPlace.neighborhood}` : ""}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold text-foreground leading-tight">
                    {selectedPlace.name}
                  </h3>
                  {selectedPlace.visitedAt && (
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                      Visited {new Date(selectedPlace.visitedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlace(null)}
                  className="shrink-0 text-muted hover:text-foreground text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {selectedPlace.notes && (
                <p className="mt-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedPlace.notes}
                </p>
              )}

              {selectedPlace.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {selectedPlace.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="rounded-md object-cover aspect-square w-full" />
                  ))}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(selectedPlace)}
                  className="flex-1 rounded-md border border-border py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-hover"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${selectedPlace.name}"?`)) {
                      handleDelete(selectedPlace.id);
                    }
                  }}
                  className="flex-1 rounded-md border border-red-200 py-1.5 text-[11px] font-medium uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* add place form */}
        {showAdd && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Add Place</h3>
                <button type="button" onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground text-lg leading-none">×</button>
              </div>
              <PlaceForm
                form={form}
                onChange={setForm}
                onSubmit={handleAdd}
                saving={saving}
                submitLabel="Add Pin"
              />
            </div>
          </div>
        )}

        {/* edit place form */}
        {editingPlace && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-border shadow-lg overflow-y-auto z-[1000]">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Edit Place</h3>
                <button type="button" onClick={() => setEditingPlace(null)} className="text-muted hover:text-foreground text-lg leading-none">×</button>
              </div>
              <PlaceForm
                form={editForm}
                onChange={setEditForm}
                onSubmit={handleEdit}
                saving={saving}
                submitLabel="Save"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── shared form ───────────────────────────────────────────────────────────────

type FormState = typeof EMPTY_FORM;

function PlaceForm({
  form,
  onChange,
  onSubmit,
  saving,
  submitLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  submitLabel: string;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Name *">
        <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Cosa Nostra" required />
      </Field>
      <Field label="City *">
        <input className={inputCls} value={form.city} onChange={set("city")} placeholder="Los Angeles" required />
      </Field>
      <Field label="Neighborhood">
        <input className={inputCls} value={form.neighborhood} onChange={set("neighborhood")} placeholder="Frogtown" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Latitude *">
          <input className={inputCls} value={form.lat} onChange={set("lat")} placeholder="34.08" required />
        </Field>
        <Field label="Longitude *">
          <input className={inputCls} value={form.lng} onChange={set("lng")} placeholder="-118.23" required />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className={`${inputCls} resize-none`} rows={4} value={form.notes} onChange={set("notes")} placeholder="Great tacos, cash only…" />
      </Field>
      <Field label="Visited date">
        <input className={inputCls} type="date" value={form.visitedAt} onChange={set("visitedAt")} />
      </Field>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-md bg-neutral-800 py-2 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

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
