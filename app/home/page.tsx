"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import { CircleCheck, Info, Megaphone, TriangleAlert, X } from "lucide-react";

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

// ── Announcement section above footer ────────────────────
function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; type: string; posted_by?: string; created_at?: string }[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const styles: Record<string, { bg: string; text: string; border: string }> = {
    info:    { bg: "bg-green-100", text: "text-[#244b30]", border: "border-green-300" },
    warning: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300" },
    success: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300" },
  };

  return (
    <section className="bg-[#e3f2e5] border-t border-green-200 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#456b4e] mb-3"><Megaphone className="h-4 w-4" /> Announcements</p>
        <div className="flex flex-col gap-2">
          {visible.map((a) => {
            const s = styles[a.type] ?? styles.info;
            return (
              <div key={a.id} className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${s.bg} ${s.border}`}>
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 ${s.text}`}>
                    {a.type === "warning" ? <TriangleAlert className="h-4 w-4" /> : a.type === "success" ? <CircleCheck className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${s.text}`}>{a.message}</p>
                    <p className="text-[10px] text-[#54745b] mt-0.5">
                      Posted by <span className="font-semibold text-[#315f40]">{a.posted_by ?? "Admin"}</span>
                      {a.created_at && `- ${new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissed((p) => [...p, a.id])}
                  className="shrink-0 text-[#64806a] hover:text-[#244b30] mt-0.5"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [userName, setUserName]     = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [liveStats, setLiveStats]   = useState<Stats | null>(null);
  const [ratings, setRatings]       = useState<RatingSummary>({});

  useEffect(() => {
    const session = getSession();
    if (session?.role === "admin") { router.replace("/admin"); return; }
    if (session?.role === "landlord") { router.replace("/landlord"); return; }
    if (session) setUserName(session.name || session.email);

    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    // Live stats — refresh every 30 seconds
    function fetchStats() {
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d) => setLiveStats(d))
        .catch(() => {});
    }
    fetchStats();
    const statsInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(statsInterval);

    // Ratings summary
    fetch("/api/reviews/summary")
      .then((r) => r.json())
      .then((d) => setRatings(d ?? {}))
      .catch(() => {});
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
    <div className="min-h-screen bg-[#387a4b] font-sans">

      {/* Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <Image src="/pic.jpg" alt="Hero" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30 flex flex-col justify-center px-6 md:px-16">
          <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-2">Find your perfect home</p>
          <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight mb-2">
            Comfortable,<br />Safe & Affordable
          </h1>
          <p className="text-gray-300 text-sm md:text-base max-w-md">
            Browse hundreds of rental properties across the Philippines. Find the home that fits your lifestyle.
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
          <button className="bg-white text-[#387a4b] text-sm font-bold px-6 py-2 rounded-lg hover:bg-green-100 transition-colors shrink-0">
            Search
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs text-green-300 font-semibold">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Live Stats
          </span>
        </div>
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
              <p className="text-xs text-white/70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section id="houses" className="max-w-6xl mx-auto px-4 mt-10 pb-16">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-white">Available Properties</h2>
          <span className="text-xs text-lime-200">{filtered.length} propert{filtered.length === 1 ? "y" : "ies"} found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-base font-extrabold text-white leading-tight">{p.title}</h3>
                    <p className="text-base font-extrabold text-yellow-300 shrink-0">₱{p.price.replace(/[^0-9,]/g, "")}</p>
                  </div>

                  <div className="flex items-center gap-1 mb-2.5">
                    <svg className="w-3.5 h-3.5 shrink-0 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs text-white/80 truncate">{p.location}</span>
                  </div>

                  {(p.beds != null || p.baths != null || p.sqm != null) && (
                    <div className="flex items-center gap-3 text-xs text-white/80 mb-2.5 font-medium">
                      {p.beds  != null && <span>🛏 {p.beds} Bed</span>}
                      {p.baths != null && <span>🚿 {p.baths} Bath</span>}
                      {p.sqm   != null && <span>📐 {p.sqm} sqm</span>}
                    </div>
                  )}

                  {p.description && (
                    <p className="text-xs text-white/70 leading-relaxed mb-3 line-clamp-2">{p.description}</p>
                  )}

                  {ratings[p.id] && (
                    <StarRating avg={ratings[p.id].avg} count={ratings[p.id].count} />
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/houses/${p.id}`); }}
                    className="w-full bg-white text-[#387a4b] text-sm font-extrabold py-2.5 rounded-lg hover:bg-green-100 transition-colors"
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
      <section id="about" className="bg-[#315f40] text-white py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <p className="text-lime-300 text-xs font-bold uppercase tracking-widest mb-2">Why choose us</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Your trusted rental partner</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              HOMERent connects tenants with verified landlords across the Philippines. Every listing is inspected and verified for your safety and comfort.
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

      {/* Announcements above footer */}
      <AnnouncementSection />

      {/* Footer */}
      <footer id="contact" className="bg-[#e3f2e5] text-[#54745b] py-8 px-4 border-t border-green-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div>
            <span className="text-[#244b30] text-lg font-bold">
              HOME<span className="text-lime-700">R</span><span className="text-lime-700 italic">ent</span>
            </span>
            <p className="text-xs mt-2 max-w-xs text-[#64806a]">Comfortable, Safe, Affordable rental homes across the Philippines.</p>
          </div>
          <div className="flex gap-12 text-xs">
            <div>
              <p className="text-[#244b30] font-semibold mb-2">Quick Links</p>
              {[
                { label: "Home",    href: "/home" },
                { label: "Houses",  href: "/houses" },
                { label: "About",   href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <p
                  key={l.label}
                  onClick={() => router.push(l.href)}
                  className="mb-1 hover:text-[#244b30] cursor-pointer transition-colors"
                >
                  {l.label}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[#244b30] font-semibold mb-2">Contact</p>
              <p className="mb-1">info@homerent.ph</p>
              <p className="mb-1">+63 912 345 6789</p>
              <p>Metro Manila, PH</p>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-green-200 mt-6 pt-4 text-center text-[10px] text-[#64806a]">
          &copy; {new Date().getFullYear()} HOMERent. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
