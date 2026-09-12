"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";

const houses = [
  {
    id: 1,
    img: "/pc1.jpg",
    price: 150000,
    label: "₱150,000/month",
    title: "Cozy Studio House",
    location: "Quezon City, Metro Manila",
    beds: 1, baths: 1, sqm: 35,
    tag: "Studio",
    badge: "Featured",
    badgeColor: "bg-yellow-400 text-yellow-900",
    rating: 4.8,
    reviews: 24,
    desc: "A small and cozy studio house perfect for one or two people. Peaceful environment with a small kitchen.",
  },
  {
    id: 2,
    img: "/pc2.jpg",
    price: 55000,
    label: "₱55,000/month",
    title: "Family Home",
    location: "Marikina City, Metro Manila",
    beds: 2, baths: 1, sqm: 80,
    tag: "House",
    badge: "Popular",
    badgeColor: "bg-cyan-500 text-white",
    rating: 4.6,
    reviews: 18,
    desc: "Comfortable house with 2 bedrooms, spacious living room and kitchen. Close to schools and stores.",
  },
  {
    id: 3,
    img: "/pc3.jpg",
    price: 32000,
    label: "₱32,000/month",
    title: "Modern Townhouse",
    location: "Pasig City, Metro Manila",
    beds: 3, baths: 2, sqm: 120,
    tag: "Townhouse",
    badge: "New",
    badgeColor: "bg-green-500 text-white",
    rating: 4.9,
    reviews: 11,
    desc: "Modern townhouse with 3 bedrooms, parking space, and a balcony. Safe and quiet neighborhood.",
  },
  {
    id: 4,
    img: "/pc4.jpg",
    price: 85000,
    label: "₱85,000/month",
    title: "Spacious Bungalow",
    location: "Las Piñas, Metro Manila",
    beds: 4, baths: 2, sqm: 200,
    tag: "Bungalow",
    badge: "Hot Deal",
    badgeColor: "bg-red-500 text-white",
    rating: 4.7,
    reviews: 32,
    desc: "Spacious bungalow with large garden, 4 bedrooms, and a covered garage. Perfect for big families.",
  },
];

const tabs = ["All", "Studio", "House", "Townhouse", "Bungalow"];

const stats = [
  { value: "500+", label: "Properties Listed" },
  { value: "1,200+", label: "Happy Tenants" },
  { value: "50+", label: "Cities Covered" },
  { value: "4.8★", label: "Average Rating" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const session = getSession();
    if (session) setUserName(session.name || session.email);
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const filtered = houses.filter((h) => {
    const matchTab = activeTab === "All" || h.tag === activeTab;
    const matchSearch =
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase()) ||
      h.tag.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Logo" width={36} height={36} className="rounded-full" />
            <span className="text-xl font-bold leading-none">
              HOME<span className="text-red-500">R</span><span className="text-red-500 italic">ent</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/home" className="text-sm font-semibold text-gray-800 border-b-2 border-gray-800 pb-0.5">Home</Link>
            <Link href="#houses" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Houses</Link>
            <Link href="#about" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">About</Link>
            <Link href="#contact" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Contact</Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative p-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                <Image src="/logo.jpg" alt="User" width={32} height={32} className="object-cover" />
              </div>
              <span className="text-xs font-semibold text-gray-700">{userName || "My Account"}</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              LOGOUT
            </button>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 flex flex-col gap-3">
            {["Home", "Houses", "About", "Contact"].map((item) => (
              <Link key={item} href="#" className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>{item}</Link>
            ))}
          </div>
        )}
      </nav>

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

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                activeTab === tab
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-sm font-semibold">No properties found</p>
            <p className="text-xs mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((h) => (
              <div key={h.id} className="bg-white rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow group">
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={h.img}
                    alt={h.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${h.badgeColor}`}>
                    {h.badge}
                  </span>
                  <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {h.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 leading-tight">{h.title}</h3>
                    <p className="text-sm font-extrabold text-gray-800 shrink-0">{h.label}</p>
                  </div>

                  <div className="flex items-center gap-1 text-gray-400 mb-2">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] text-gray-500 truncate">{h.location}</span>
                  </div>

                  {/* Amenities */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {h.beds} Bed
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {h.baths} Bath
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      {h.sqm} sqm
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{h.desc}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    <StarRating rating={h.rating} />
                    <span className="text-[10px] text-gray-500">{h.rating} ({h.reviews} reviews)</span>
                  </div>

                  <button className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors">
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
