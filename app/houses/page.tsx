"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

type Property = {
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

type RatingSummary = Record<string, { avg: number; count: number }>;

// ── Star display ─────────────────────────────────────────
function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            className={`w-3 h-3 ${n <= Math.round(avg) ? "text-yellow-400" : "text-gray-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] font-bold text-gray-700">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
}

const statusColor: Record<string, string> = {
  Available:   "bg-green-100 text-green-700",
  Booked:      "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

export default function HousesPage() {
  const router = useRouter();
  const [properties, setProperties]   = useState<Property[]>([]);
  const [favorites, setFavorites]     = useState<Set<string>>(new Set());
  const [ratings, setRatings]         = useState<RatingSummary>({});
  const [recentIds, setRecentIds]     = useState<string[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minPrice, setMinPrice]       = useState("");
  const [maxPrice, setMaxPrice]       = useState("");
  const [bedsFilter, setBedsFilter]   = useState("Any");
  const [loading, setLoading]         = useState(true);
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState<string | null>(null);

  // Extract numeric part from price string e.g. "₱25,000/month" → 25000
  function parsePrice(price: string): number {
    return Number(price.replace(/[^0-9]/g, "")) || 0;
  }

  useEffect(() => {
    const s = getSession();
    if (s) setUserEmail(s.email);
    const recent: string[] = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
    setRecentIds(recent);

    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch all ratings in one request
    fetch("/api/reviews/summary")
      .then((r) => r.json())
      .then((d) => setRatings(d ?? {}))
      .catch(() => {});
  }, []);

  // Load favorites once email is known
  useEffect(() => {
    if (!userEmail) return;
    fetch(`/api/favorites?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setFavorites(new Set(d.map((f: { property_id: string }) => f.property_id)));
      });
  }, [userEmail]);

  const toggleFavorite = useCallback(async (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    if (!userEmail) { router.push("/login"); return; }
    setTogglingFav(propertyId);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: userEmail, property_id: propertyId }),
    });
    const data = await res.json();
    if (res.ok) {
      setFavorites((prev) => {
        const next = new Set(prev);
        data.favorited ? next.add(propertyId) : next.delete(propertyId);
        return next;
      });
    }
    setTogglingFav(null);
  }, [userEmail, router]);

  // Unique cities for location filter
  const cities = Array.from(new Set(properties.map((p) => p.location.split(",")[0].trim()))).sort();

  const filtered = properties.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const price = parsePrice(p.price);
    const matchMin = !minPrice || price >= Number(minPrice);
    const matchMax = !maxPrice || price <= Number(maxPrice);
    const matchBeds = bedsFilter === "Any" || (bedsFilter === "4+" ? (p.beds ?? 0) >= 4 : p.beds === Number(bedsFilter));
    return matchSearch && matchStatus && matchMin && matchMax && matchBeds;
  });

  function clearFilters() {
    setSearch(""); setStatusFilter("All");
    setMinPrice(""); setMaxPrice(""); setBedsFilter("Any");
  }

  const hasActiveFilters = search || statusFilter !== "All" || minPrice || maxPrice || bedsFilter !== "Any";

  return (
    <main className="min-h-screen bg-[#800000]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-white mb-1">Available Houses</h1>
        <p className="text-red-200 text-sm mb-6">
          Browse all rental properties — {properties.length} listing{properties.length !== 1 ? "s" : ""}
        </p>

        {/* ── Recently Viewed ── */}
        {recentIds.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-extrabold text-white mb-3">🕒 Recently Viewed</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentIds
                .map((rid) => properties.find((p) => p.id === rid))
                .filter(Boolean)
                .slice(0, 6)
                .map((p) => (
                  <div
                    key={p!.id}
                    onClick={() => router.push(`/houses/${p!.id}`)}
                    className="shrink-0 w-40 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl cursor-pointer hover:bg-white/20 transition-colors"
                  >
                    <div className="relative h-24 bg-white/10 rounded-t-xl overflow-hidden">
                      {p!.images?.[0] ? (
                        <Image src={p!.images[0]} alt={p!.title} fill sizes="160px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">No image</div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold text-white truncate">{p!.title}</p>
                      <p className="text-[10px] text-red-200 truncate">{p!.price}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6 flex flex-col gap-3">
          {/* Row 1: search + status */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-white/40">
              <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                className="text-sm outline-none w-full bg-transparent text-white placeholder-white/50"
                placeholder="Search by name or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-white/60 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All" className="text-gray-800">All Status</option>
              <option value="Available" className="text-gray-800">Available</option>
              <option value="Booked" className="text-gray-800">Booked</option>
              <option value="Maintenance" className="text-gray-800">Maintenance</option>
            </select>
          </div>

          {/* Row 2: price range + beds + clear */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70 font-semibold whitespace-nowrap">Price (₱)</span>
              <input
                type="number" min="0" placeholder="Min"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-2 focus:ring-white/40 text-white placeholder-white/40"
                value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className="text-white/40 text-sm">—</span>
              <input
                type="number" min="0" placeholder="Max"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-2 focus:ring-white/40 text-white placeholder-white/40"
                value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70 font-semibold">Beds</span>
              <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40" value={bedsFilter} onChange={(e) => setBedsFilter(e.target.value)}>
                <option value="Any" className="text-gray-800">Any</option>
                {[1, 2, 3].map((n) => <option key={n} value={String(n)} className="text-gray-800">{n}</option>)}
                <option value="4+" className="text-gray-800">4+</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-300 hover:text-white font-semibold ml-auto">
                Clear filters
              </button>
            )}
          </div>

          {/* Result count */}
          <p className="text-xs text-white/50">
            {filtered.length} propert{filtered.length === 1 ? "y" : "ies"} found
            {hasActiveFilters && " (filtered)"}
          </p>
        </div>

        {/* ── Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl overflow-hidden border border-white/20 animate-pulse">
                <div className="h-44 bg-white/10" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-8 bg-white/10 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-sm font-semibold text-white/70">No properties found</p>
            <p className="text-xs mt-1">{properties.length === 0 ? "No properties have been added yet." : "Try adjusting your filters."}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-xs text-red-300 hover:text-white">Clear all filters</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p, index) => (
              <div
                key={p.id}
                onClick={() => router.push(`/houses/${p.id}`)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden hover:bg-white/20 transition-colors group cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-white/5">
                  {p.images?.[0] ? (
                    <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" priority={index === 0} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">No image</div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {p.status}
                  </span>
                  {/* Heart button */}
                  <button
                    onClick={(e) => toggleFavorite(e, p.id)}
                    disabled={togglingFav === p.id}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
                    title={favorites.has(p.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg className={`w-4 h-4 transition-colors ${favorites.has(p.id) ? "text-red-400" : "text-white/70"}`} fill={favorites.has(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-white leading-tight">{p.title}</h3>
                    <p className="text-sm font-extrabold text-red-200 shrink-0">{p.price}</p>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <svg className="w-3 h-3 shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] text-white/60 truncate">{p.location}</span>
                  </div>
                  {(p.beds != null || p.baths != null || p.sqm != null) && (
                    <div className="flex items-center gap-3 text-[10px] text-white/60 mb-2">
                      {p.beds != null && <span>🛏 {p.beds} Bed</span>}
                      {p.baths != null && <span>🚿 {p.baths} Bath</span>}
                      {p.sqm != null && <span>📐 {p.sqm} sqm</span>}
                    </div>
                  )}
                  {ratings[p.id] && (
                    <StarRating avg={ratings[p.id].avg} count={ratings[p.id].count} />
                  )}
                  {p.description && <p className="text-[10px] text-white/50 line-clamp-2 mb-3 leading-relaxed">{p.description}</p>}
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/houses/${p.id}`); }}
                    className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/20"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
