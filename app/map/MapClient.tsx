"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import type { MapPlace } from "@/app/api/map/places/route";

// Fix Leaflet's default icon path issue with webpack/Next.js
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#1a1a18;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pinIconActive = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#c2410c;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13, { animate: true, duration: 0.8 });
  }, [map, lat, lng]);
  return null;
}

export default function MapCanvas({
  places,
  selected,
  onSelect,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (p: MapPlace) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {selected && <FlyTo lat={selected.lat} lng={selected.lng} />}
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={selected?.id === p.id ? pinIconActive : pinIcon}
          eventHandlers={{ click: () => onSelect(p) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            {p.neighborhood ? <><br /><span style={{ color: "#666" }}>{p.neighborhood}</span></> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
