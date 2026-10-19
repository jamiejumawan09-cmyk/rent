"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapListing } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        const mapped: MapListing[] = (Array.isArray(data) ? data : [])
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
  }, []);

  return (
    <main className="min-h-screen bg-[#800000]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-white mb-1">Listings Map</h1>
        <p className="text-red-200 text-sm mb-5">
          {loading ? "Loading..." : `${listings.length} propert${listings.length !== 1 ? "ies" : "y"} with location data`}
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
