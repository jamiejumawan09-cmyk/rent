"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getSession } from "@/lib/session";

// ── Helpers ──────────────────────────────────────────────
function saveRecentlyViewed(id: string) {
  const key = "recently_viewed";
  const prev: string[] = JSON.parse(localStorage.getItem(key) || "[]");
  const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
  localStorage.setItem(key, JSON.stringify(next));
}

function toggleCompare(id: string): boolean {
  const key = "compare_ids";
  const prev: string[] = JSON.parse(localStorage.getItem(key) || "[]");
  if (prev.includes(id)) {
    localStorage.setItem(key, JSON.stringify(prev.filter((x) => x !== id)));
    return false;
  }
  if (prev.length >= 3) return false;
  localStorage.setItem(key, JSON.stringify([...prev, id]));
  return true;
}

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

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
  latitude?: number;
  longitude?: number;
};

type Review = {
  id: string;
  user_email: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  Available:   "bg-green-100 text-green-700",
  Booked:      "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

function StarRow({ rating, onPick, interactive = false }: { rating: number; onPick?: (n: number) => void; interactive?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          onClick={() => interactive && onPick?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`w-4 h-4 transition-colors ${interactive ? "cursor-pointer" : ""} ${n <= (interactive ? hovered || rating : rating) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [property, setProperty]   = useState<Property | null>(null);
  const [imgIndex, setImgIndex]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [session, setSession]     = useState<{ email: string; name: string } | null>(null);

  // Booking form
  const [form, setForm] = useState({
    move_in_date:      "",
    lease_duration:    "6 months",
    occupants:         "1",
    payment_method:    "Cash",
    contact_method:    "Email",
    employment_status: "Employed",
    introduction:      "",
    message:           "",
  });
  const [govIdFile,    setGovIdFile]    = useState<File | null>(null);
  const [incomeFile,   setIncomeFile]   = useState<File | null>(null);
  const [docErrors,    setDocErrors]    = useState({ govId: false, income: false });
  const [termsAgreed,  setTermsAgreed]  = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Share
  const [copied, setCopied] = useState(false);

  // Compare
  const [inCompare, setInCompare] = useState(false);

  // Chat
  const [showChat, setShowChat]     = useState(false);
  const [messages, setMessages]     = useState<{id:string;sender_email:string;sender_name:string;content:string;created_at:string}[]>([]);
  const [chatMsg, setChatMsg]       = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [landlordEmail, setLandlordEmail] = useState("");

  // Reviews
  const [reviews, setReviews]         = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [canReview, setCanReview]     = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewForm, setReviewForm]   = useState({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 0, comment: "" });
  const [savingEditReview, setSavingEditReview] = useState(false);

  useEffect(() => {
    setSession(getSession());
    saveRecentlyViewed(id);
    const compareIds: string[] = JSON.parse(localStorage.getItem("compare_ids") || "[]");
    setInCompare(compareIds.includes(id));

    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProperty(d);
        setLandlordEmail(d.landlord_email || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/reviews?property_id=${id}`)
      .then((r) => r.json())
      .then((d) => { setReviews(Array.isArray(d) ? d : []); setReviewsLoading(false); })
      .catch(() => setReviewsLoading(false));
  }, [id]);

  // Check if current user can review (has Approved booking, hasn't reviewed yet)
  useEffect(() => {
    const s = getSession();
    if (!s) return;
    fetch(`/api/bookings?email=${encodeURIComponent(s.email)}`)
      .then((r) => r.json())
      .then((bookings) => {
        if (!Array.isArray(bookings)) return;
        const approved = bookings.some((b) => b.property_id === id && b.status === "Approved");
        setCanReview(approved);
      });
  }, [id]);

  useEffect(() => {
    const s = getSession();
    if (!s || !reviews.length) return;
    setHasReviewed(reviews.some((r) => r.user_email === s.email));
  }, [reviews]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    if (!form.move_in_date) { setBookingError("Please select a move-in date."); return; }
    const missingGovId  = !govIdFile;
    const missingIncome = !incomeFile;
    if (missingGovId || missingIncome) {
      setDocErrors({ govId: missingGovId, income: missingIncome });
      setBookingError("Please upload both required documents before submitting.");
      return;
    }
    setDocErrors({ govId: false, income: false });
    if (!termsAgreed) { setBookingError("Please agree to the rental terms before submitting."); return; }
    setBooking(true); setBookingError("");

    // Auto-calculate move-out date from move-in + lease duration
    function calcMoveOut(moveIn: string, duration: string): string {
      const d = new Date(moveIn);
      const map: Record<string, number> = {
        "1 month": 1, "3 months": 3, "6 months": 6, "1 year": 12,
      };
      d.setMonth(d.getMonth() + (map[duration] ?? 6));
      return d.toISOString().split("T")[0];
    }

    const fd = new FormData();
    fd.append("property_id",       id);
    fd.append("user_email",        session.email);
    fd.append("user_name",         session.name);
    fd.append("move_in_date",      form.move_in_date);
    fd.append("move_out_date",     calcMoveOut(form.move_in_date, form.lease_duration));
    fd.append("lease_duration",    form.lease_duration);
    fd.append("occupants",         form.occupants);
    fd.append("payment_method",    form.payment_method);
    fd.append("contact_method",    form.contact_method);
    fd.append("employment_status", form.employment_status);
    fd.append("introduction",      form.introduction);
    fd.append("message",           form.message);
    if (govIdFile)   fd.append("gov_id",       govIdFile);
    if (incomeFile)  fd.append("income_proof", incomeFile);

    const res = await fetch("/api/bookings", { method: "POST", body: fd });
    const data = await res.json();
    setBooking(false);
    if (!res.ok) { setBookingError(data.error); return; }
    setBookingSuccess(true);
  }

  function handleShare(platform: string) {
    const url = window.location.href;
    const text = `Check out this rental: ${property?.title}`;
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
    }
  }

  function handleCompare() {
    const added = toggleCompare(id);
    setInCompare(added);
    if (added) router.push("/compare");
  }

  async function loadMessages() {
    if (!session) return;
    const res = await fetch(`/api/messages?property_id=${id}&email=${encodeURIComponent(session.email)}`);
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !chatMsg.trim() || !landlordEmail) return;
    setSendingMsg(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: id, sender_email: session.email, sender_name: session.name, receiver_email: landlordEmail, content: chatMsg }),
    });
    setChatMsg("");
    setSendingMsg(false);
    loadMessages();
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    if (reviewForm.rating === 0) { setReviewError("Please select a star rating."); return; }
    setSubmittingReview(true); setReviewError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: id, user_email: session.email, user_name: session.name, rating: reviewForm.rating, comment: reviewForm.comment }),
    });
    const data = await res.json();
    setSubmittingReview(false);
    if (!res.ok) { setReviewError(data.error); return; }
    setReviews((prev) => [data, ...prev]);
    setHasReviewed(true);
    setReviewForm({ rating: 0, comment: "" });
    setReviewSuccess("Your review has been submitted!");
    setTimeout(() => setReviewSuccess(""), 4000);
  }

  async function handleEditReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !editingReview) return;
    if (editReviewForm.rating === 0) return;
    setSavingEditReview(true);
    const res = await fetch(`/api/reviews/${editingReview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: session.email, rating: editReviewForm.rating, comment: editReviewForm.comment }),
    });
    const data = await res.json();
    setSavingEditReview(false);
    if (!res.ok) return;
    setReviews((prev) => prev.map((r) => r.id === editingReview.id ? data : r));
    setEditingReview(null);
  }

  async function handleDeleteReview(reviewId: string) {
    if (!session || !confirm("Delete your review?")) return;
    await fetch("/api/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, user_email: session.email }),
    });
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setHasReviewed(false);
  }

  // Computed stats
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Property not found.</div>;

  const images = property.images?.length ? property.images : [];

  return (
    <div className="min-h-screen bg-[#800000]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleCompare} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${inCompare ? "bg-gray-800 text-white" : "bg-white text-gray-600 border-gray-300 hover:border-gray-600"}`}>
              {inCompare ? "✓ In Compare" : "⚖️ Compare"}
            </button>
            <button onClick={() => handleShare("facebook")} className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-700">f</button>
            <button onClick={() => handleShare("whatsapp")} className="w-7 h-7 rounded-full bg-green-500 text-white text-xs flex items-center justify-center hover:bg-green-600">W</button>
            <button onClick={() => handleShare("copy")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${copied ? "bg-green-500 text-white" : "bg-white text-gray-600 border-gray-300 hover:border-gray-600"}`}>
              {copied ? "✓ Copied!" : "🔗 Copy"}
            </button>
          </div>
        </div>
        {/* ── Edit Review Modal ── */}
        {editingReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-extrabold text-gray-800">Edit Review</p>
                <button onClick={() => setEditingReview(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleEditReviewSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Rating *</label>
                  <StarRow rating={editReviewForm.rating} interactive onPick={(n) => setEditReviewForm((f) => ({ ...f, rating: n }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Comment</label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                    value={editReviewForm.comment}
                    onChange={(e) => setEditReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingReview(null)} className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={savingEditReview} className="flex-1 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">
                    {savingEditReview ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Chat modal ── */}
        {showChat && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{height:"420px"}}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="text-sm font-extrabold text-gray-800">💬 Message Landlord</p>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {messages.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No messages yet. Start the conversation!</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_email === session?.email ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${m.sender_email === session?.email ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-800"}`}>
                      <p>{m.content}</p>
                      <p className="text-[10px] mt-0.5 text-gray-400">{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="px-4 py-3 border-t flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Type a message..."
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                />
                <button type="submit" disabled={sendingMsg} className="bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">Send</button>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: images + details + reviews ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Image carousel */}
            <div className="relative w-full h-72 md:h-96 rounded-xl overflow-hidden bg-gray-200">
              {images.length > 0 ? (
                <Image src={images[imgIndex]} alt={property.title} fill sizes="100vw" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No images</div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">‹</button>
                  <button onClick={() => setImgIndex((i) => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center">›</button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => <button key={i} onClick={() => setImgIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/40"}`} />)}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${i === imgIndex ? "border-gray-800" : "border-transparent"}`}>
                    <Image src={src} alt={`thumb-${i}`} fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property info */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-xl font-extrabold text-gray-800">{property.title}</h1>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusColor[property.status] ?? "bg-gray-100 text-gray-600"}`}>{property.status}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{property.location}</span>
              </div>
              {avgRating && (
                <div className="flex items-center gap-1.5 mb-3">
                  <StarRow rating={Math.round(Number(avgRating))} />
                  <span className="text-xs font-bold text-gray-700">{avgRating}</span>
                  <span className="text-xs text-gray-400">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                </div>
              )}
              <p className="text-2xl font-extrabold text-gray-800 mb-4">{property.price}</p>
              {(property.beds || property.baths || property.sqm) && (
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  {property.beds  && <span>🛏 {property.beds} Bed{property.beds > 1 ? "s" : ""}</span>}
                  {property.baths && <span>🚿 {property.baths} Bath{property.baths > 1 ? "s" : ""}</span>}
                  {property.sqm   && <span>📐 {property.sqm} sqm</span>}
                </div>
              )}
              {property.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{property.description}</p>
                </div>
              )}
              {property.latitude && property.longitude && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Location</p>
                  <Map
                    listings={[]}
                    single={{ lat: property.latitude, lng: property.longitude, title: property.title }}
                  />
                </div>
              )}
            </div>

            {/* ── Reviews section ── */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-800">
                  Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
                </h2>
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <StarRow rating={Math.round(Number(avgRating))} />
                    <span className="text-sm font-bold text-gray-700">{avgRating} / 5</span>
                  </div>
                )}
              </div>

              {/* Submit review form */}
              {canReview && !hasReviewed && (
                <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-xl border p-4 mb-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-gray-700">Leave a Review</p>
                  {reviewError   && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{reviewError}</p>}
                  {reviewSuccess && <p className="text-green-600 text-xs bg-green-50 border border-green-200 rounded px-3 py-2">{reviewSuccess}</p>}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Rating *</label>
                    <StarRow rating={reviewForm.rating} interactive onPick={(n) => setReviewForm((f) => ({ ...f, rating: n }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Comment (optional)</label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                      placeholder="Share your experience with this property..."
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    />
                  </div>
                  <button type="submit" disabled={submittingReview} className="self-end bg-gray-800 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}

              {canReview && hasReviewed && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-xs text-green-700 font-semibold">
                  ✅ You have already reviewed this property.
                </div>
              )}

              {!canReview && session && (
                <div className="bg-gray-50 border rounded-lg px-3 py-2 mb-4 text-xs text-gray-500">
                  Only tenants with an approved booking can leave a review.
                </div>
              )}

              {/* Review list */}
              {reviewsLoading ? (
                <div className="flex flex-col gap-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="flex flex-col divide-y">
                  {reviews.map((r) => (
                    <div key={r.id} className="py-4 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {r.user_name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{r.user_name}</p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StarRow rating={r.rating} />
                          {session?.email === r.user_email && (
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingReview(r); setEditReviewForm({ rating: r.rating, comment: r.comment }); }} className="text-[10px] text-blue-500 hover:underline">Edit</button>
                              <button onClick={() => handleDeleteReview(r.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-gray-600 leading-relaxed mt-2 ml-10">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: booking form ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-5 shadow-sm sticky top-6">
              <h2 className="text-sm font-extrabold text-gray-800 mb-4">Book This Property</h2>
              {landlordEmail && session && (
                <button
                  type="button"
                  onClick={() => { setShowChat(true); loadMessages(); }}
                  className="w-full mb-3 flex items-center justify-center gap-2 border border-gray-300 text-xs font-bold py-2 rounded-lg hover:bg-gray-50"
                >
                  💬 Message Landlord
                </button>
              )}
              {bookingSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Booking Submitted!</p>
                  <p className="text-xs text-gray-500 mt-1">Your request has been sent to the landlord for review.</p>
                  <button onClick={() => router.push("/bookings")} className="mt-4 w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700">
                    View My Bookings
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

                  {/* ── Price summary ── */}
                  <div className="bg-gray-50 rounded-lg border p-3 flex flex-col gap-1.5">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide">Price Summary</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Monthly rent</span>
                      <span className="font-bold text-gray-800">{property.price}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Security deposit</span>
                      <span className="font-bold text-gray-800">1 month</span>
                    </div>
                    <div className="border-t border-gray-200 pt-1.5 flex justify-between text-xs">
                      <span className="font-extrabold text-gray-800">Est. first payment</span>
                      <span className="font-extrabold text-gray-900">2× monthly</span>
                    </div>
                  </div>

                  {/* ── Move-in Date ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Move-in Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.move_in_date}
                      onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
                    />
                  </div>

                  {/* ── Lease Duration ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Lease Duration *</label>
                    <select
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.lease_duration}
                      onChange={(e) => setForm({ ...form, lease_duration: e.target.value })}
                    >
                      <option>1 month</option>
                      <option>3 months</option>
                      <option>6 months</option>
                      <option>1 year</option>
                    </select>
                    {form.move_in_date && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Move-out: {(() => {
                          const d = new Date(form.move_in_date);
                          const m: Record<string, number> = { "1 month": 1, "3 months": 3, "6 months": 6, "1 year": 12 };
                          d.setMonth(d.getMonth() + (m[form.lease_duration] ?? 6));
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        })()}
                      </p>
                    )}
                  </div>

                  {/* ── Occupants ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Number of Occupants *</label>
                    <input
                      type="number" min="1" max="20"
                      required
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.occupants}
                      onChange={(e) => setForm({ ...form, occupants: e.target.value })}
                    />
                  </div>

                  {/* ── Payment Method ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Payment Method *</label>
                    <select
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.payment_method}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    >
                      <option>Cash</option>
                      <option>GCash</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>

                  {/* ── Employment Status ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Employment Status *</label>
                    <select
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                      value={form.employment_status}
                      onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
                    >
                      <option>Employed</option>
                      <option>Self-employed</option>
                      <option>Student</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* ── Preferred Contact ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Preferred Contact</label>
                    <div className="flex gap-3 mt-1">
                      {["Email", "Phone", "Messaging"].map((m) => (
                        <label key={m} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                          <input
                            type="radio"
                            name="contact_method"
                            value={m}
                            checked={form.contact_method === m}
                            onChange={() => setForm({ ...form, contact_method: m })}
                            className="accent-gray-800"
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ── Tenant Introduction ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">About You</label>
                    <textarea
                      rows={3}
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                      placeholder="Brief introduction — occupation, reason for renting, lifestyle..."
                      value={form.introduction}
                      onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                    />
                  </div>

                  {/* ── Message ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Message (optional)</label>
                    <textarea
                      rows={2}
                      className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                      placeholder="Any questions or notes for the landlord..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </div>

                  {/* ── Government ID ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Government ID <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`mt-0.5 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${docErrors.govId ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-400"}`}
                      onClick={() => document.getElementById("gov-id-input")?.click()}
                    >
                      {govIdFile ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{govIdFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setGovIdFile(null); setDocErrors((d) => ({ ...d, govId: true })); }} className="text-red-400 text-xs hover:text-red-600">✕</button>
                        </div>
                      ) : (
                        <p className={`text-xs ${docErrors.govId ? "text-red-400" : "text-gray-400"}`}>Click to upload ID (JPG, PNG, PDF)</p>
                      )}
                      <input
                        id="gov-id-input" type="file" accept="image/*,.pdf" className="hidden"
                        onChange={(e) => { setGovIdFile(e.target.files?.[0] ?? null); setDocErrors((d) => ({ ...d, govId: false })); }}
                      />
                    </div>
                    {docErrors.govId && <p className="text-[10px] text-red-500 mt-0.5">Government ID is required.</p>}
                  </div>

                  {/* ── Proof of Income ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Proof of Income <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`mt-0.5 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${docErrors.income ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-400"}`}
                      onClick={() => document.getElementById("income-input")?.click()}
                    >
                      {incomeFile ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{incomeFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setIncomeFile(null); setDocErrors((d) => ({ ...d, income: true })); }} className="text-red-400 text-xs hover:text-red-600">✕</button>
                        </div>
                      ) : (
                        <p className={`text-xs ${docErrors.income ? "text-red-400" : "text-gray-400"}`}>Payslip, COE, or bank statement</p>
                      )}
                      <input
                        id="income-input" type="file" accept="image/*,.pdf" className="hidden"
                        onChange={(e) => { setIncomeFile(e.target.files?.[0] ?? null); setDocErrors((d) => ({ ...d, income: false })); }}
                      />
                    </div>
                    {docErrors.income && <p className="text-[10px] text-red-500 mt-0.5">Proof of Income is required.</p>}
                  </div>

                  {/* ── Terms & Conditions ── */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 accent-gray-800 shrink-0"
                    />
                    <span className="text-[10px] text-gray-500 leading-relaxed">
                      I agree to the rental terms. I confirm the information provided is accurate and understand that a security deposit equal to one month&apos;s rent is required upon approval.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={booking || !session}
                    className="w-full bg-gray-800 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
                  >
                    {booking ? "Submitting..." : "Submit Booking Request"}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">The landlord will review and respond to your request.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
