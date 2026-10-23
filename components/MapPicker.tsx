"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onAddress?: (address: string) => void;
};

export default function MapPicker({ lat, lng, onChange, onAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (containerRef.current as any)._leaflet_id;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initLat = lat ?? 12.8797;
      const initLng = lng ?? 121.774;
      const map = L.map(containerRef.current!).setView([initLat, initLng], lat ? 15 : 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (lat && lng) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
          reverseGeocode(pos.lat, pos.lng);
        });
      }

      map.on("click", (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange(pos.lat, pos.lng);
            reverseGeocode(pos.lat, pos.lng);
          });
        }
        onChange(clickLat, clickLng);
        reverseGeocode(clickLat, clickLng);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        // Build a clean address: "City, Province/State, Country"
        const parts = [
          a.city || a.town || a.municipality || a.village || a.suburb,
          a.state || a.province || a.region,
          a.country,
        ].filter(Boolean);
        const address = parts.join(", ");
        if (address) onAddress?.(address);
      }
    } catch {
      // silently ignore reverse geocode failures
    }
  }

  async function handleSearch(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!data.length) { setSearchError("Address not found."); return; }
      const { lat: rLat, lon: rLon, address } = data[0];
      const newLat = parseFloat(rLat);
      const newLng = parseFloat(rLon);
      if (address) {
        const parts = [
          address.city || address.town || address.municipality || address.village || address.suburb,
          address.state || address.province || address.region,
          address.country,
        ].filter(Boolean);
        const cleanAddress = parts.join(", ");
        onAddress?.(cleanAddress || data[0].display_name);
      } else {
        onAddress?.(data[0].display_name);
      }

      import("leaflet").then((L) => {
        const map = mapRef.current!;
        map.setView([newLat, newLng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const marker = L.marker([newLat, newLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange(pos.lat, pos.lng);
          });
        }
        onChange(newLat, newLng);
      });
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white placeholder-white/30"
          placeholder="Search address to auto-fill location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
        />
        <button
          type="button"
          disabled={searching}
          onClick={handleSearch}
          className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-white/30 disabled:opacity-60 border border-white/20"
        >
          {searching ? "..." : "Search"}
        </button>
      </div>
      {searchError && <p className="text-lime-500 text-[10px]">{searchError}</p>}
      <p className="text-[10px] text-white/50">Click on the map or drag the marker — location will be auto-filled.</p>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border"
        style={{ height: "260px" }}
      />
      {lat && lng && (
        <p className="text-[10px] text-white/50">
          📍 {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
