"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MapListing = {
  id: string;
  title: string;
  price: string;
  address: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  status: string;
};

type Props = {
  listings: MapListing[];
  single?: { lat: number; lng: number; title: string };
};

export default function Map({ listings, single }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<MapListing[]>(listings);
  const radiusCircleRef = useRef<unknown>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [nearMe, setNearMe] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadius, setShowRadius] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  listingsRef.current = listings;

  function parsePrice(price: string) {
    return Number(price.replace(/[^0-9]/g, "")) || 0;
  }

  function getFiltered() {
    return listingsRef.current.filter((l) => {
      const p = parsePrice(l.price);
      if (minPrice && p < Number(minPrice)) return false;
      if (maxPrice && p > Number(maxPrice)) return false;
      return true;
    });
  }

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("leaflet").then(async (L) => {
      if (cancelled || mapRef.current || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!).setView([12.8797, 121.774], 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers with clustering
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    (async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      // leaflet.markercluster is a UMD plugin that self-attaches to window.L.
      // Expose the exact same L instance globally before loading the plugin.
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>).L = L;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (L as any).markerClusterGroup !== "function") {
          // require() is synchronous after the dynamic import above,
          // ensuring the plugin patches the same L already on window.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require("leaflet.markercluster");
        }
      }

      const map = mapRef.current!;

      // Remove existing cluster groups and non-user markers
      map.eachLayer((layer) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const l = layer as any;
        if (l._isClusterGroup || (layer instanceof L.Marker && !l._isUserMarker)) {
          map.removeLayer(layer);
        }
      });

      if (single) {
        L.marker([single.lat, single.lng]).addTo(map)
          .bindPopup(`<b>${single.title}</b>`).openPopup();
        map.setView([single.lat, single.lng], 15);
        return;
      }

      const filtered = getFiltered();
      if (filtered.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({ maxClusterRadius: 60 });
      cluster._isClusterGroup = true;

      const bounds: [number, number][] = [];

      filtered.forEach((listing) => {
        const marker = L.marker([listing.latitude, listing.longitude]);
        bounds.push([listing.latitude, listing.longitude]);

        const img = listing.image_url
          ? `<img src="${listing.image_url}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
          : "";

        const streetViewUrl = `https://www.google.com/maps?q=&layer=c&cbll=${listing.latitude},${listing.longitude}`;

        marker.bindPopup(`
          <div style="width:170px;font-family:sans-serif;">
            ${img}
            <b style="font-size:12px;">${listing.title}</b><br/>
            <span style="font-size:11px;color:#555;">${listing.address}</span><br/>
            <span style="font-size:13px;font-weight:bold;color:#1a1a1a;">${listing.price}</span><br/>
            <div style="display:flex;gap:8px;margin-top:4px;">
              <a href="/houses/${listing.id}" style="font-size:11px;color:#2563eb;">View →</a>
              <a href="${streetViewUrl}" target="_blank" rel="noopener" style="font-size:11px;color:#16a34a;">🌐 Street View</a>
            </div>
          </div>
        `);

        cluster.addLayer(marker);
      });

      map.addLayer(cluster);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, listings.length, minPrice, maxPrice, single]);

  // Radius circle update
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userPos) return;
    import("leaflet").then((L) => {
      const map = mapRef.current!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (radiusCircleRef.current) map.removeLayer(radiusCircleRef.current as any);
      if (showRadius) {
        const circle = L.circle(userPos, {
          radius: radiusKm * 1000,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(map);
        radiusCircleRef.current = circle;
      } else {
        radiusCircleRef.current = null;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRadius, radiusKm, userPos, mapReady]);

  // Near me
  useEffect(() => {
    if (!nearMe || !mapRef.current) return;
    import("leaflet").then((L) => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        const map = mapRef.current!;

        map.eachLayer((layer) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((layer as any)._isUserMarker) map.removeLayer(layer);
        });

        const userIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.8);"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const userMarker = L.marker([latitude, longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup("📍 You are here");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userMarker as any)._isUserMarker = true;
        userMarker.openPopup();

        const allPoints: [number, number][] = [[latitude, longitude]];
        getFiltered().forEach((l) => allPoints.push([l.latitude, l.longitude]));
        if (allPoints.length > 1) map.fitBounds(allPoints, { padding: [50, 50] });
        else map.setView([latitude, longitude], 13);
      }, () => {
        alert("Could not get your location. Please allow location access.");
        setNearMe(false);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearMe]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {!single && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="font-semibold">Price (₱)</span>
            <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="border rounded px-2 py-1 w-24 outline-none focus:ring-1 focus:ring-gray-400" />
            <span>—</span>
            <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="border rounded px-2 py-1 w-24 outline-none focus:ring-1 focus:ring-gray-400" />
          </div>
          <button onClick={() => setNearMe(true)} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
            📍 Near Me
          </button>
          {userPos && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRadius((v) => !v)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${showRadius ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
              >
                ⭕ Radius
              </button>
              {showRadius && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="range" min={1} max={50} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className="w-24 accent-blue-600" />
                  <span className="font-semibold w-12">{radiusKm} km</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border shadow-sm" style={{ height: single ? "280px" : "500px" }} />
    </div>
  );
}
