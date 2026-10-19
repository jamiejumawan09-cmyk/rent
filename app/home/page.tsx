"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";

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

const statusBadge: Record<string, string> = {
  Available:   "bg-green-100 text-green-700",
  Booked:      "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

type RatingSummary = Record<string, { avg: number; count: number }>;

// ── Star display ─────────────────────────────────────────
function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg key={n} className={`w-3 h-3 ${n <= Math.round(avg) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] font-bold text-gray-700">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
}

type Stats = {
  properties: number;
  tenants: number;
  cities: number;
  bookings: number;
  avgRating: string | null;
  totalReviews: number;
};

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [userName, setUserName]     = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [liveStats, setLiveStats]   = useState<Stats | null>(null);
  const [ratings, setRatings]       = useState<RatingSummary>({});
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; type: string }[]>([]);
  const [dismissedAnnounce, setDismissedAnnounce] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (session?.role === "admin") { router.replace("/admin"); return; }
    if (session?.role === "landlord") { router.replace("/landlord"); return; }
    if (session) setUserName(session.name || session.email);

    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    // Live stats
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setLiveStats(d))
      .catch(() => {});

    // Ratings summary
    fetch("/api/reviews/summary")
      .then((r) => r.json())
      .then((d) => setRatings(d ?? {}))
      .catch(() => {});

    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []));
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const filtered = properties.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#800000] font-sans">

      {/* Announcement banners */}
      {announcements.filter((a) => !dismissedAnnounce.includes(a.id)).map((a) => {
        const styles: Record<string, string> = {
          info:    "bg-blue-600 text-white",
          warning: "bg-yellow-400 text-yellow-900",
          success: "bg-green-600 text-white",
        };
        return (
          <div key={a.id} className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium ${styles[a.type] ?? styles.info}`}>
            <span>{a.message}</span>
            <button onClick={() => setDismissedAnnounce((p) => [...p, a.id])} className="shrink-0 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        );
      })}

      {/* Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <Image src="/pic.jpg" alt="Hero" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30 flex flex-col justify-center px-6 md:px-16">
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Find your perfect home</p>
          <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight mb-2">
            Comfortable,<br />Safe & Affordable
          </h1>
          <p className="text-gray-300 text-sm md:text-base max-w-md">
            Browse hundreds of rental properties across Metro Manila. Find the home that fits your lifestyle.
          </p>
        </div>
      </section>

      {/* Search bar */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-white/40">
            <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              className="text-sm outline-none w-full bg-transparent text-white placeholder-white/50"
              placeholder="Search by name, location, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/50 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button className="bg-white text-[#800000] text-sm font-bold px-6 py-2 rounded-lg hover:bg-red-100 transition-colors shrink-0">
            Search
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Properties Listed", value: liveStats ? `${liveStats.properties}` : "—", icon: "🏠" },
            { label: "Happy Tenants",     value: liveStats ? `${liveStats.tenants}` : "—",     icon: "👥" },
            { label: "Cities Covered",    value: liveStats ? `${liveStats.cities}` : "—",      icon: "📍" },
            {
              label: "Average Rating",
              value: liveStats ? liveStats.avgRating ? `${liveStats.avgRating}★` : "N/A" : "—",
              icon: "⭐",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
              <p className="text-xl mb-1">{s.icon}</p>
              <p className={`text-2xl font-extrabold text-white ${!liveStats ? "animate-pulse opacity-30" : ""}`}>
                {s.value}
              </p>
              <p className="text-xs text-red-200 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section id="houses" className="max-w-6xl mx-auto px-4 mt-10 pb-16">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-white">Available Properties</h2>
          <span className="text-xs text-red-200">{filtered.length} propert{filtered.length === 1 ? "y" : "ies"} found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl overflow-hidden border border-white/20 animate-pulse">
                <div className="h-44 bg-white/10" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
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
            <p className="text-xs mt-1">{properties.length === 0 ? "No properties have been added yet." : "Try a different search."}</p>
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
                    <Image src={p.images[0]} alt={p.title} fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">No image</div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {p.status}
                  </span>
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
                      {p.beds  != null && <span>🛏 {p.beds} Bed</span>}
                      {p.baths != null && <span>🚿 {p.baths} Bath</span>}
                      {p.sqm   != null && <span>📐 {p.sqm} sqm</span>}
                    </div>
                  )}

                  {p.description && (
                    <p className="text-[10px] text-white/50 leading-relaxed mb-3 line-clamp-2">{p.description}</p>
                  )}

                  {ratings[p.id] && (
                    <StarRating avg={ratings[p.id].avg} count={ratings[p.id].count} />
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/houses/${p.id}`); }}
                    className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 rounded-lg border border-white/20 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About / CTA banner */}
      <section id="about" className="bg-[#5c0000] text-white py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-2">Why choose us</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Your trusted rental partner</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              HOMERent connects tenants with verified landlords across Metro Manila. Every listing is inspected and verified for your safety and comfort.
            </p>
            <div className="flex gap-4 mt-6">
              {["Verified Listings", "24/7 Support", "Secure Payments"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-white/70">
                  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-72 h-48 rounded-xl overflow-hidden shrink-0">
            <Image src="/pic2.jpg" alt="About" fill sizes="(max-width: 768px) 100vw, 288px" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#4a0000] text-white/60 py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div>
            <span className="text-white text-lg font-bold">
              HOME<span className="text-red-300">R</span><span className="text-red-300 italic">ent</span>
            </span>
            <p className="text-xs mt-2 max-w-xs text-white/50">Comfortable, Safe, Affordable rental homes across Metro Manila.</p>
          </div>
          <div className="flex gap-12 text-xs">
            <div>
              <p className="text-white font-semibold mb-2">Quick Links</p>
              {["Home", "Houses", "About", "Contact"].map((l) => (
                <p key={l} className="mb-1 hover:text-white cursor-pointer">{l}</p>
              ))}
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Contact</p>
              <p className="mb-1">info@homerent.ph</p>
              <p className="mb-1">+63 912 345 6789</p>
              <p>Metro Manila, PH</p>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-white/10 mt-6 pt-4 text-center text-[10px] text-white/30">
          © {new Date().getFullYear()} HOMERent. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
