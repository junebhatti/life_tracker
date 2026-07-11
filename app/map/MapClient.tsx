"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { useEffect } from "react";
import type { MapPlace } from "@/app/api/map/places/route";

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#1a1a18;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pinIconActive = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#2323e8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Saved neighbourhood/area outlines — always visible, subtle, so you can see the
// shape of every place you've mapped. The selected one is drawn brighter.
const areaStyle: L.PathOptions = {
  color: "#2323e8",
  weight: 1.5,
  opacity: 0.5,
  fillColor: "#2323e8",
  fillOpacity: 0.04,
};
const areaStyleActive: L.PathOptions = {
  color: "#2323e8",
  weight: 2.5,
  opacity: 0.9,
  fillColor: "#2323e8",
  fillOpacity: 0.1,
};

const circleStyle: L.PathOptions = {
  color: "#2323e8",
  weight: 1.5,
  opacity: 0.7,
  fillColor: "#2323e8",
  fillOpacity: 0.06,
};

/** Combined bounds of every visible place (polygon extents + point pins). */
function placesBounds(places: MapPlace[]): L.LatLngBounds | null {
  const bounds = L.latLngBounds([]);
  for (const p of places) {
    if (p.boundaryGeoJson) {
      try {
        bounds.extend(L.geoJSON(p.boundaryGeoJson as GeoJsonObject).getBounds());
        continue;
      } catch {
        /* fall through to the point */
      }
    }
    bounds.extend([p.lat, p.lng]);
  }
  return bounds.isValid() ? bounds : null;
}

/** Flies to a single selected place (used when a pin is clicked). */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { animate: true, duration: 0.8 });
  }, [map, lat, lng]);
  return null;
}

/** Fits the map to everything currently visible — re-runs whenever `fitKey`
 *  changes (e.g. you switch to a different neighbourhood or city). */
function FitBounds({ places, fitKey }: { places: MapPlace[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    const bounds = placesBounds(places);
    if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

export default function MapCanvas({
  places,
  selected,
  fitKey,
  onSelect,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  /** Changes whenever the visible set should be re-framed (city/neighbourhood switch). */
  fitKey: string;
  onSelect: (p: MapPlace) => void;
}) {
  const areas = places.filter((p) => p.boundaryGeoJson);

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Frame the visible places when the selection scope changes; when a single
          pin is actively selected, fly to it instead. */}
      {selected ? <FlyTo lat={selected.lat} lng={selected.lng} /> : null}
      <FitBounds places={places} fitKey={fitKey} />

      {/* All saved neighbourhood / area outlines, selected one highlighted */}
      {areas.map((p) => (
        <GeoJSON
          key={`boundary-${p.id}-${selected?.id === p.id ? "on" : "off"}`}
          data={p.boundaryGeoJson as GeoJsonObject}
          style={() => (selected?.id === p.id ? areaStyleActive : areaStyle)}
          eventHandlers={{ click: () => onSelect(p) }}
        />
      ))}

      {/* radius circle for the selected point place (restaurants, shops, etc.) */}
      {selected && !selected.boundaryGeoJson && (
        <Circle
          key={`circle-${selected.id}`}
          center={[selected.lat, selected.lng]}
          radius={120}
          pathOptions={circleStyle}
        />
      )}

      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={selected?.id === p.id ? pinIconActive : pinIcon}
          eventHandlers={{ click: () => onSelect(p) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            {p.officialName && p.officialName !== p.name && (
              <><br /><span style={{ color: "#888", fontSize: "11px" }}>{p.officialName}</span></>
            )}
            {p.neighborhood ? <><br /><span style={{ color: "#666" }}>{p.neighborhood}</span></> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
