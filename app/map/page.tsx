"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapListing } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  function fetchListings() {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        const all = Array.isArray(data) ? data : [];
        setTotal(all.length);
        const mapped: MapListing[] = all
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            id: p.id as string,
            title: p.title as string,
            price: p.price as string,
            address: p.location as string,
            latitude: p.latitude as number,
            longitude: p.longitude as number,
            image_url: Array.isArray(p.images) && p.images.length > 0 ? (p.images[0] as string) : undefined,
            status: p.status as string,
          }));
        setListings(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchListings();
    // Refresh every 30 seconds
    const interval = setInterval(fetchListings, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#387a4b]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-white">Listings Map</h1>
          <span className="flex items-center gap-1.5 text-xs text-green-300 font-semibold">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Live
          </span>
        </div>
        <p className="text-white/70 text-sm mb-5">
          {loading
            ? "Loading..."
            : `${listings.length} of ${total} propert${total !== 1 ? "ies" : "y"} pinned on map`}
        </p>
        {loading ? (
          <div className="w-full h-[500px] rounded-xl bg-white/10 animate-pulse" />
        ) : (
          <Map listings={listings} />
        )}
      </div>
    </main>
  );
}
