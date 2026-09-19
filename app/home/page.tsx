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

const stats = [
  { value: "500+", label: "Properties Listed" },
  { value: "1,200+", label: "Happy Tenants" },
  { value: "50+", label: "Cities Covered" },
  { value: "4.8★", label: "Average Rating" },
];

const statusBadge: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Booked: "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) setUserName(session.name || session.email);
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
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
    <div className="min-h-screen bg-gray-50 font-sans">

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
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center flex-1 border rounded-lg px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-gray-300">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              className="text-sm outline-none w-full"
              placeholder="Search by name, location, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button className="bg-gray-800 text-white text-sm font-bold px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors shrink-0">
            Search
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 text-center shadow-sm border">
              <p className="text-2xl font-extrabold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section id="houses" className="max-w-6xl mx-auto px-4 mt-10 pb-16">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-gray-800">Available Properties</h2>
          <span className="text-xs text-gray-500">{filtered.length} propert{filtered.length === 1 ? "y" : "ies"} found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-sm font-semibold">No properties found</p>
            <p className="text-xs mt-1">{properties.length === 0 ? "No properties have been added yet." : "Try a different search."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p, index) => (
              <div
                key={p.id}
                onClick={() => router.push(`/houses/${p.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow group cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  {p.images?.[0] ? (
                    <Image
                      src={p.images[0]}
                      alt={p.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {p.status}
                  </span>
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 leading-tight">{p.title}</h3>
                    <p className="text-sm font-extrabold text-gray-800 shrink-0">{p.price}</p>
                  </div>

                  <div className="flex items-center gap-1 text-gray-400 mb-2">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] text-gray-500 truncate">{p.location}</span>
                  </div>

                  {/* Amenities */}
                  {(p.beds != null || p.baths != null || p.sqm != null) && (
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                      {p.beds != null && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {p.beds} Bed
                        </span>
                      )}
                      {p.baths != null && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {p.baths} Bath
                        </span>
                      )}
                      {p.sqm != null && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          {p.sqm} sqm
                        </span>
                      )}
                    </div>
                  )}

                  {p.description && (
                    <p className="text-[10px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{p.description}</p>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/houses/${p.id}`); }}
                    className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors"
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
      <section id="about" className="bg-gray-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Why choose us</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Your trusted rental partner</h2>
            <p className="text-gray-300 text-sm leading-relaxed max-w-md">
              HOMERent connects tenants with verified landlords across Metro Manila. Every listing is inspected and verified for your safety and comfort.
            </p>
            <div className="flex gap-4 mt-6">
              {["Verified Listings", "24/7 Support", "Secure Payments"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-gray-300">
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
      <footer id="contact" className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div>
            <span className="text-white text-lg font-bold">
              HOME<span className="text-red-500">R</span><span className="text-red-500 italic">ent</span>
            </span>
            <p className="text-xs mt-2 max-w-xs">Comfortable, Safe, Affordable rental homes across Metro Manila.</p>
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
        <div className="max-w-6xl mx-auto border-t border-gray-800 mt-6 pt-4 text-center text-[10px]">
          © {new Date().getFullYear()} HOMERent. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
