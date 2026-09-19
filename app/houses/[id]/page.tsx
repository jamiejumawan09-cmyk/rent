"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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

const statusColor: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Booked: "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ move_in_date: "", message: "" });
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    setSession(getSession());
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((d) => { setProperty(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    if (!form.move_in_date) { setBookingError("Please select a move-in date."); return; }
    setBooking(true);
    setBookingError("");

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: id,
        user_email: session.email,
        user_name: session.name,
        move_in_date: form.move_in_date,
        message: form.message,
      }),
    });

    const data = await res.json();
    setBooking(false);
    if (!res.ok) { setBookingError(data.error); return; }
    setBookingSuccess(true);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>
  );

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Property not found.</div>
  );

  const images = property.images?.length ? property.images : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: images + details */}
          <div className="lg:col-span-2">
            {/* Image carousel */}
            <div className="relative w-full h-72 md:h-96 rounded-xl overflow-hidden bg-gray-200 mb-3">
              {images.length > 0 ? (
                <Image src={images[imgIndex]} alt={property.title} fill sizes="100vw" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No images</div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >‹</button>
                  <button
                    onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >›</button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${i === imgIndex ? "border-gray-800" : "border-transparent"}`}>
                    <Image src={src} alt={`thumb-${i}`} fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-xl font-extrabold text-gray-800">{property.title}</h1>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusColor[property.status] ?? "bg-gray-100 text-gray-600"}`}>{property.status}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 mb-3">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{property.location}</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-800 mb-4">{property.price}</p>
              {(property.beds || property.baths || property.sqm) && (
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  {property.beds && <span>🛏 {property.beds} Bed{property.beds > 1 ? "s" : ""}</span>}
                  {property.baths && <span>🚿 {property.baths} Bath{property.baths > 1 ? "s" : ""}</span>}
                  {property.sqm && <span>📐 {property.sqm} sqm</span>}
                </div>
              )}
              {property.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{property.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: booking form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-5 shadow-sm sticky top-6">
              <h2 className="text-sm font-extrabold text-gray-800 mb-4">Book This Property</h2>

              {bookingSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Booking Submitted!</p>
                  <p className="text-xs text-gray-500 mt-1">Your request is pending admin approval.</p>
                  <button onClick={() => router.push("/home")} className="mt-4 w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700">
                    Back to Home
                  </button>
                </div>
              ) : property.status !== "Available" ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">This property is currently <span className="font-bold text-gray-700">{property.status}</span> and cannot be booked.</p>
                </div>
              ) : (
                <form onSubmit={handleBook} className="flex flex-col gap-3">
                  {bookingError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{bookingError}</p>}

                  {!session && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      You need to <button type="button" onClick={() => router.push("/login")} className="underline font-semibold">log in</button> to book.
                    </p>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Move-in Date *</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.move_in_date}
                      onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Message (optional)</label>
                    <textarea
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                      rows={3}
                      placeholder="Any questions or notes for the landlord..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={booking}
                    className="w-full bg-gray-800 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-60"
                  >
                    {booking ? "Submitting..." : "Submit Booking Request"}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">Admin will review and approve your request.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
