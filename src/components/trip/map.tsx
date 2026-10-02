"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export type MapPoint = {
  id: string;
  dayId: string;
  label: string;
  title: string;
  subtitle: string;
  type: string;
  lat: number;
  lng: number;
};

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** A round numbered pin. Leaflet renders it outside React, so it is an HTML string styled in globals.css. */
const pin = (point: MapPoint, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="roamly-pin" data-type="${point.type}" data-active="${active}">${point.label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

/** Keeps the visible points in view when the day filter changes. */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => p.id).join(",");
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14, animate: false });
    // `key` stands in for `points`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function TripMap({
  points,
  hoveredId,
  onHover,
}: {
  points: MapPoint[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  // One dotted line per day, through that day's stops in order.
  const routes = useMemo(() => {
    const byDay = new Map<string, [number, number][]>();
    for (const p of points) byDay.set(p.dayId, [...(byDay.get(p.dayId) ?? []), [p.lat, p.lng]]);
    return [...byDay.entries()].filter(([, line]) => line.length > 1);
  }, [points]);

  const center: [number, number] = points.length ? [points[0].lat, points[0].lng] : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 12 : 2}
      scrollWheelZoom={false}
      className="h-full w-full rounded-lg"
      aria-label="Map of the itinerary"
    >
      <TileLayer
        url={TILE_URL}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitBounds points={points} />
      {routes.map(([dayId, line]) => (
        <Polyline key={dayId} positions={line} pathOptions={{ className: "roamly-route" }} />
      ))}
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={pin(point, hoveredId === point.id)}
          zIndexOffset={hoveredId === point.id ? 1000 : 0}
          eventHandlers={{ mouseover: () => onHover(point.id), mouseout: () => onHover(null) }}
          title={point.title}
        >
          <Popup>
            <strong>{point.title}</strong>
            <br />
            {point.subtitle}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
