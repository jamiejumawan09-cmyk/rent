"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";

type FavoriteProperty = {
  property_id: string;
  properties: {
    id: string;
    title: string;
    location: string;
    price: string;
    status: string;
    description: string;
    images: string[];
    beds?: number;
    baths?: number;
    sqm?: number;
  };
};

const statusColor: Record<string, string> = {
  Available:   "bg-green-100 text-green-700",
  Booked:      "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [loading, setLoading]     = useState(true);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [email, setEmail]         = useState("");

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    setEmail(s.email);
    fetch(`/api/favorites?email=${encodeURIComponent(s.email)}`)
      .then((r) => r.json())
      .then((d) => { setFavorites(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleRemove(propertyId: string) {
    setRemoving(propertyId);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: email, property_id: propertyId }),
    });
    setFavorites((prev) => prev.filter((f) => f.property_id !== propertyId));
    setRemoving(null);
  }

  return (
    <main className="min-h-screen bg-[#800000]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-800">My Favorites</h1>
          <p className="text-sm text-gray-500 mt-1">Properties you&apos;ve saved to your wishlist</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🤍</div>
            <p className="text-sm font-semibold">No saved properties yet</p>
            <p className="text-xs mt-1 mb-4">Tap the heart icon on any property to save it here.</p>
            <button
              onClick={() => router.push("/houses")}
              className="bg-gray-800 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-gray-700"
            >
              Browse Houses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favorites.map((f) => {
              const p = f.properties;
              return (
                <div key={f.property_id} className="bg-white rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow group">
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-gray-100">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                    {/* Remove heart */}
                    <button
                      onClick={() => handleRemove(f.property_id)}
                      disabled={removing === f.property_id}
                      className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
                      title="Remove from favorites"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="text-sm font-bold text-gray-800 leading-tight">{p.title}</h3>
                      <span className="text-sm font-extrabold text-gray-800 shrink-0">{p.price}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 mb-2">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] text-gray-500 truncate">{p.location}</span>
                    </div>
                    {(p.beds != null || p.baths != null || p.sqm != null) && (
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                        {p.beds != null && <span>🛏 {p.beds} Bed</span>}
                        {p.baths != null && <span>🚿 {p.baths} Bath</span>}
                        {p.sqm != null && <span>📐 {p.sqm} sqm</span>}
                      </div>
                    )}
                    {p.description && <p className="text-[10px] text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                    <button
                      onClick={() => router.push(`/houses/${p.id}`)}
                      className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
