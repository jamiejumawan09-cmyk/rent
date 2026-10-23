"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";
import { CalendarDays, Eye, RotateCcw, X } from "lucide-react";

// -- Refund request shape -----------------------------------------------------
type RefundRequest = {
  id: string;
  booking_id: string;
  payment_method: string;
  reason?: string | null;
  status: "Pending" | "Processing" | "Processed" | "Denied";
  landlord_note?: string | null;
  refund_proof_url?: string | null;
  created_at: string;
  resolved_at?: string | null;
};

// -- Move-out request shape ----------------------------------------------------
type MoveOutRequest = {
  id: string;
  booking_id: string;
  move_out_date: string;
  reason?: string | null;
  status: "Pending" | "Acknowledged" | "Completed" | "Cancelled";
  created_at: string;
};

type Booking = {
  id: string;
  property_id: string;
  user_email: string;
  user_name: string;
  move_in_date: string;
  move_out_date?: string;
  lease_duration?: string;
  occupants?: number;
  message: string;
  payment_method: string;
  employment_status?: string;
  contact_method?: string;
  introduction?: string;
  gov_id_url?: string;
  income_proof_url?: string;
  payment_receipt_url?: string | null;
  payment_confirmed?: boolean;
  moved_in?: boolean;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  created_at: string;
  properties: {
    title: string;
    location: string;
    price: string;
    images: string[];
    landlord_email?: string;
    landlord_name?: string;
  };
};

type Notification = { id: string; message: string; type: string; is_read: boolean; created_at: string };

const statusStyle: Record<string, string> = {
  Pending:   "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Approved:  "bg-green-100 text-green-800 border border-green-300",
  Rejected:  "bg-lime-100 text-lime-800 border border-lime-300",
  Cancelled: "bg-gray-100 text-gray-700 border border-gray-200",
};

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#387a4b]" />}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Document viewer
  type DocModal = { name: string; url: string } | null;
  const [docModal, setDocModal] = useState<DocModal>(null);
  const [docSignedUrl, setDocSignedUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  async function openDocModal(name: string, url: string) {
    setDocModal({ name, url });
    setDocSignedUrl(null);
    setDocError("");
    setDocLoading(true);
    const res = await fetch("/api/documents/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setDocLoading(false);
    if (!res.ok) { setDocError(data.error ?? "Failed to load document."); return; }
    setDocSignedUrl(data.signedUrl);
  }

  function closeDocModal() {
    setDocModal(null);
    setDocSignedUrl(null);
    setDocError("");
  }

  // Receipt upload
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [receiptError, setReceiptError]         = useState<Record<string, string>>({});

  // Refund state
  const [refunds, setRefunds]                       = useState<RefundRequest[]>([]);
  const [showRefundForm, setShowRefundForm]         = useState<string | null>(null); // booking id
  const [refundReason, setRefundReason]             = useState("");
  const [submittingRefund, setSubmittingRefund]     = useState(false);
  const [refundError, setRefundError]               = useState("");

  // Move-out state
  const [moveOuts, setMoveOuts]                     = useState<MoveOutRequest[]>([]);
  const [showMoveOutForm, setShowMoveOutForm]       = useState<string | null>(null); // booking id
  const [moveOutDate, setMoveOutDate]               = useState("");
  const [moveOutReason, setMoveOutReason]           = useState("");
  const [submittingMoveOut, setSubmittingMoveOut]   = useState(false);
  const [moveOutError, setMoveOutError]             = useState("");
  const [cancellingMoveOut, setCancellingMoveOut]   = useState<string | null>(null);

  async function handleReceiptUpload(bookingId: string, file: File) {
    if (!session) return;
    setUploadingReceipt(bookingId);
    setReceiptError((e) => ({ ...e, [bookingId]: "" }));
    const fd = new FormData();
    fd.append("id",               bookingId);
    fd.append("user_email",       session.email);
    fd.append("payment_receipt",  file);
    const res  = await fetch("/api/bookings", { method: "PUT", body: fd });
    const data = await res.json();
    setUploadingReceipt(null);
    if (!res.ok) { setReceiptError((e) => ({ ...e, [bookingId]: data.error })); return; }
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, payment_receipt_url: data.payment_receipt_url } : b));
  }

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    setSession(s);
    fetch(`/api/bookings?email=${encodeURIComponent(s.email)}`)
      .then((r) => r.json())
      .then((d) => { setBookings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/notifications?email=${encodeURIComponent(s.email)}`)
      .then((r) => r.json())
      .then((d) => setNotifications(Array.isArray(d) ? d : []));
    // Load tenant's refund requests
    fetch(`/api/refunds?email=${encodeURIComponent(s.email)}&role=user`)
      .then((r) => r.json())
      .then((d) => setRefunds(Array.isArray(d) ? d : []));
    // Load tenant's move-out requests
    fetch(`/api/move-out?email=${encodeURIComponent(s.email)}&role=user`)
      .then((r) => r.json())
      .then((d) => setMoveOuts(Array.isArray(d) ? d : []));
  }, [router]);

  // Scroll to and highlight the booking from notification link
  useEffect(() => {
    if (!highlightId || loading) return;
    setHighlightedId(highlightId);
    setTimeout(() => {
      const el = cardRefs.current[highlightId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedId(null), 3000);
    }, 300);
  }, [highlightId, loading]);

  async function markAllRead() {
    if (!session) return;
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleCancel(id: string, currentStatus: string) {
    const booking = bookings.find((b) => b.id === id);
    const needsRefund =
      currentStatus === "Approved" &&
      !!booking?.payment_receipt_url &&
      booking?.payment_method === "GCash";

    const msg = needsRefund
      ? "Cancel this approved booking? Since your payment was confirmed, you'll be prompted to submit a refund request."
      : currentStatus === "Approved"
      ? "Cancel this approved booking? The property will be marked as Available again."
      : "Cancel this booking request?";

    if (!confirm(msg)) return;
    setCancelling(id);
    const s = getSession();
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: "Cancelled",
        user_email: s?.email,
        role: s?.role ?? "user",
      }),
    });
    setCancelling(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to cancel booking.");
      return;
    }
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, status: "Cancelled" as Booking["status"] } : b)
    );
    // Auto-open refund form if payment was confirmed
    if (needsRefund) setShowRefundForm(id);
  }

  async function handleRefundSubmit(bookingId: string) {
    if (!session) return;
    setSubmittingRefund(true);
    setRefundError("");
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        tenant_email: session.email,
        reason: refundReason.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmittingRefund(false);
    if (!res.ok) { setRefundError(data.error ?? "Failed to submit refund request."); return; }
    setRefunds((prev) => [data, ...prev]);
    setShowRefundForm(null);
    setRefundReason("");
  }

  async function handleMoveOutSubmit(bookingId: string) {
    if (!session || !moveOutDate) return;
    setSubmittingMoveOut(true);
    setMoveOutError("");
    const res = await fetch("/api/move-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        tenant_email: session.email,
        tenant_name: session.name,
        move_out_date: moveOutDate,
        reason: moveOutReason.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmittingMoveOut(false);
    if (!res.ok) { setMoveOutError(data.error ?? "Failed to submit move-out request."); return; }
    setMoveOuts((prev) => [data, ...prev]);
    setShowMoveOutForm(null);
    setMoveOutDate("");
    setMoveOutReason("");
  }

  async function handleCancelMoveOut(moveOutId: string) {
    if (!session) return;
    if (!confirm("Cancel your move-out request?")) return;
    setCancellingMoveOut(moveOutId);
    const res = await fetch("/api/move-out", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: moveOutId, status: "Cancelled", actor_email: session.email, role: "user" }),
    });
    setCancellingMoveOut(null);
    if (res.ok) setMoveOuts((prev) => prev.map((m) => m.id === moveOutId ? { ...m, status: "Cancelled" } : m));
  }
  const counts = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === "Pending").length,
    approved:  bookings.filter((b) => b.status === "Approved").length,
    rejected:  bookings.filter((b) => b.status === "Rejected").length,
    cancelled: bookings.filter((b) => b.status === "Cancelled").length,
  };

  return (
    <main className="min-h-screen bg-[#387a4b]">

      {/* -- Document viewer modal -- */}
      {docModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeDocModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-extrabold text-white">{docModal.name}</p>
              <div className="flex items-center gap-3">
                {docSignedUrl && (
                  <a href={docSignedUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Open in new tab ?</a>
                )}
      <button onClick={closeDocModal} aria-label="Close" className="text-white/50 hover:text-white/80"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
              {docLoading && (
                <div className="flex flex-col items-center gap-2 text-white/50">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  <p className="text-xs">Loading document�</p>
                </div>
              )}
              {!docLoading && docError && (
                <p className="text-xs text-lime-300 bg-lime-500/20 border border-lime-400/30 rounded px-4 py-3">{docError}</p>
              )}
              {!docLoading && docSignedUrl && (
                docModal.url.match(/\.(jpg|jpeg|png|gif|webp)([?#]|$)/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={docSignedUrl} alt={docModal.name} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
                ) : (
                  <iframe src={docSignedUrl} className="w-full h-[65vh] rounded-lg border" title={docModal.name} />
                )
              )}
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white">My Bookings</h1>
            <p className="text-sm text-white/70 mt-1">Track all your rental booking requests</p>
          </div>
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs((v) => !v); if (!showNotifs) markAllRead(); }}
              className="relative w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-lime-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-11 w-72 bg-[#315f40] border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-xs font-extrabold text-white">Notifications</p>
                <button onClick={() => setShowNotifs(false)} aria-label="Close notifications" className="text-white/50 hover:text-white/80"><X className="h-4 w-4" /></button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-white/50 text-center py-6">No notifications yet.</p>
                  ) : notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b last:border-0 ${n.is_read ? "" : "bg-blue-500/20"}`}>
                      <p className="text-xs text-white/90">{n.message}</p>
                      <p className="text-[10px] text-white/50 mt-0.5">{new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
            {[
              { label: "Total",     value: counts.total,     icon: "📋", bg: "bg-white/10",        text: "text-white",      sub: "text-white/60" },
              { label: "Pending",   value: counts.pending,   icon: "🕐", bg: "bg-yellow-100", text: "text-yellow-800", sub: "text-yellow-700" },
              { label: "Approved",  value: counts.approved,  icon: "✅", bg: "bg-green-100",  text: "text-green-800",  sub: "text-green-700" },
              { label: "Rejected",  value: counts.rejected,  icon: "❌", bg: "bg-red-100",    text: "text-red-800",    sub: "text-red-700" },
              { label: "Cancelled", value: counts.cancelled, icon: "🚫", bg: "bg-white/5",         text: "text-white/50",   sub: "text-white/30" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-white/10 rounded-xl p-4 text-center`}>
                <p className="text-lg mb-1">{s.icon}</p>
                <p className={`text-2xl font-extrabold ${s.text}`}>{s.value}</p>
                <p className={`text-[11px] font-semibold mt-0.5 ${s.sub}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Booking list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4 flex gap-4 animate-pulse">
                <div className="w-24 h-20 bg-white/10 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-white/50">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-green-700" />
            <p className="text-sm font-semibold">No bookings yet</p>
            <p className="text-xs mt-1 mb-4">Browse available properties and submit a booking request.</p>
            <button
              onClick={() => router.push("/houses")}
              className="bg-gray-800 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-gray-700"
            >
              Browse Houses
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                ref={(el) => { cardRefs.current[b.id] = el; }}
                className={`backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-500 ${
                  highlightedId === b.id
                    ? "border-yellow-400 ring-2 ring-yellow-400/60 bg-yellow-500/10"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row">

                  {/* Property image */}
                  <div className="relative w-full sm:w-36 h-40 sm:h-auto shrink-0 bg-white/10">
                    {b.properties?.images?.[0] ? (
                      <Image
                        src={b.properties.images[0]}
                        alt={b.properties.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 144px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                    <div>
                      {/* Title + status */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-white leading-tight">
                          {b.properties?.title ?? "�"}
                        </h3>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusStyle[b.status]}`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Location + price */}
                      <div className="flex items-center gap-1 mt-1 text-white/50">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[11px] text-white/60">{b.properties?.location ?? "�"}</span>
                        <span className="text-white/40 mx-1">�</span>
                        <span className="text-[11px] font-bold text-white/90">{b.properties?.price ?? "�"}</span>
                      </div>
                    </div>

                    {/* Booking info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Move-in Date</p>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">
                          {new Date(b.move_in_date).toLocaleDateString("en-US", {
                            month: "long", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.move_out_date && (
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Move-out Date</p>
                          <p className="text-xs font-semibold text-white/90 mt-0.5">
                            {new Date(b.move_out_date).toLocaleDateString("en-US", {
                              month: "long", day: "numeric", year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                      {b.lease_duration && (
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Lease Duration</p>
                          <p className="text-xs font-semibold text-white/90 mt-0.5">{b.lease_duration}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Submitted</p>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">
                          {new Date(b.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.occupants != null && (
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Occupants</p>
                          <p className="text-xs font-semibold text-white/90 mt-0.5">{b.occupants} person{b.occupants !== 1 ? "s" : ""}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Payment</p>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">{b.payment_method ?? "�"}</p>
                      </div>
                      {b.employment_status && (
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Employment</p>
                          <p className="text-xs font-semibold text-white/90 mt-0.5">{b.employment_status}</p>
                        </div>
                      )}
                      {b.contact_method && (
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Contact via</p>
                          <p className="text-xs font-semibold text-white/90 mt-0.5">{b.contact_method}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Booked by</p>
                        <p className="text-xs font-semibold text-white/90 mt-0.5 truncate">{b.user_name}</p>
                      </div>
                    </div>

                    {/* Introduction */}
                    {b.introduction && (
                      <div className="bg-blue-500/20 rounded-lg px-3 py-2 border border-blue-100">
                        <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-0.5">About the Tenant</p>
                        <p className="text-xs text-white/80 leading-relaxed line-clamp-3">{b.introduction}</p>
                      </div>
                    )}

                    {/* Message */}
                    {b.message && (
                      <div className="bg-white/5 rounded-lg px-3 py-2 border">
                        <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-0.5">Your Message</p>
                        <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{b.message}</p>
                      </div>
                    )}

                    {/* Documents */}
                    {(b.gov_id_url || b.income_proof_url || b.payment_receipt_url) && (
                      <div className="flex flex-wrap gap-2">
                        {b.gov_id_url && (
                          <button
                            onClick={() => openDocModal("Government ID", b.gov_id_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/20 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            View Government ID
                          </button>
                        )}
                        {b.income_proof_url && (
                          <button
                            onClick={() => openDocModal("Income Proof", b.income_proof_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-green-800 bg-green-100 border border-green-300 px-2.5 py-1 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            View Income Proof
                          </button>
                        )}
                        {b.payment_receipt_url && (
                          <button
                            onClick={() => openDocModal("Payment Receipt", b.payment_receipt_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-purple-200 bg-purple-500/20 border border-purple-400/30 px-2.5 py-1 rounded-lg hover:bg-purple-500/30 transition-colors"
                          >
                            View Receipt
                          </button>
                        )}
                      </div>
                    )}

                    {/* Payment receipt upload � show on Pending so tenant uploads before approval */}
                    {["Pending", "Approved"].includes(b.status) && b.payment_method === "GCash" && (
                      <div className={`rounded-xl border px-4 py-3 ${b.payment_confirmed ? "bg-green-500/20 border-green-400/30" : b.payment_receipt_url ? "bg-purple-500/20 border-purple-400/30" : "bg-amber-500/20 border-amber-400/30"}`}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs font-extrabold text-white">
                              {b.payment_confirmed
                                ? "Payment Confirmed"
                                : b.payment_receipt_url
                                ? "Receipt Submitted - Awaiting Approval"
                                : "Upload GCash Receipt"}
                            </p>
                            <p className="text-[10px] text-white/60 mt-0.5">
                              {b.payment_confirmed
                                ? "Your payment has been verified by the landlord."
                                : b.payment_receipt_url
                                ? "Your receipt has been submitted. The landlord will approve your booking once verified."
                                : "Upload your GCash payment screenshot. The landlord can only approve after you submit it."}
                            </p>
                            {receiptError[b.id] && (
                              <p className="text-[10px] text-lime-300 mt-1">{receiptError[b.id]}</p>
                            )}
                          </div>
                          {!b.payment_confirmed && (
                            <label className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${uploadingReceipt === b.id ? "opacity-60 cursor-not-allowed bg-white/10 text-white/60" : "bg-white text-[#387a4b] hover:bg-green-100"}`}>
                              {uploadingReceipt === b.id ? "Uploading�" : b.payment_receipt_url ? "Re-upload" : "Upload Receipt"}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploadingReceipt === b.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReceiptUpload(b.id, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status banner */}
                    {b.status === "Approved" && (
                      <div className="flex flex-col gap-2 bg-green-100 border border-green-300 rounded-lg px-3 py-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                              <p className="text-xs text-green-800 font-semibold">
                              Approved! The landlord will contact you soon.
                            </p>
                          </div>
                          {/* Moved-in badge */}
                          {b.moved_in && (
                            <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-2">
                              <span className="text-base">🏠</span>
                              <div>
                                <p className="text-xs font-extrabold text-blue-800">Move-In Confirmed!</p>
                                <p className="text-[10px] text-blue-700">The landlord has confirmed your move-in. Enjoy your new home!</p>
                              </div>
                            </div>
                          )}
                          {b.moved_in ? (
                            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800">Moved In</span>
                          ) : (
                            <button
                              onClick={() => handleCancel(b.id, b.status)}
                              disabled={cancelling === b.id}
                              className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-lime-500/80 text-white hover:bg-lime-600 disabled:opacity-60 transition-colors"
                            >
                              {cancelling === b.id ? "Cancelling�" : "Cancel Booking"}
                            </button>
                          )}
                        </div>
                        {/* Landlord contact info */}
                        <div className="ml-6 flex flex-wrap gap-3">
                          {b.properties?.landlord_name && (
                            <div className="flex items-center gap-1.5 text-xs text-green-800">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-semibold">{b.properties.landlord_name}</span>
                            </div>
                          )}
                          {b.properties?.landlord_email && (
                            <a
                              href={`mailto:${b.properties.landlord_email}`}
                              className="flex items-center gap-1.5 text-xs text-green-800 hover:text-green-950 font-semibold underline underline-offset-2"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {b.properties.landlord_email}
                            </a>
                          )}
                        </div>

                        {/* -- Move-out section -- */}
                        {(() => {
                          const moveOut = moveOuts.find((m) => m.booking_id === b.id);
                          const moveOutStatusStyle: Record<string, string> = {
                            Pending:      "bg-yellow-100 border-yellow-300 text-yellow-800",
                            Acknowledged: "bg-blue-100 border-blue-300 text-blue-800",
                            Completed:    "bg-green-100 border-green-300 text-green-800",
                            Cancelled:    "bg-gray-100 border-gray-200 text-gray-700",
                          };
                          // Already have an active/completed request � show status
                          if (moveOut && moveOut.status !== "Cancelled") {
                            return (
                              <div className={`rounded-lg border px-3 py-2.5 ${moveOutStatusStyle[moveOut.status]}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <p className="text-xs font-extrabold">Move-Out {moveOut.status}</p>
                                    </div>
                                    <p className="text-[10px] opacity-80">
                                      Scheduled: {new Date(moveOut.move_out_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    </p>
                                    {moveOut.reason && <p className="text-[10px] mt-0.5 italic opacity-70">Reason: &quot;{moveOut.reason}&quot;</p>}
                                  </div>
                                  {moveOut.status === "Pending" && (
                                    <button
                                      onClick={() => handleCancelMoveOut(moveOut.id)}
                                      disabled={cancellingMoveOut === moveOut.id}
                                      className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-lime-500/70 text-white hover:bg-lime-600 disabled:opacity-60 transition-colors"
                                    >
                                      {cancellingMoveOut === moveOut.id ? "�" : "Cancel Request"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // Show form if open
                          if (showMoveOutForm === b.id) {
                            return (
                              <div className="bg-white/10 border border-white/20 rounded-lg p-3 flex flex-col gap-2">
                                <p className="flex items-center gap-1.5 text-xs font-extrabold text-white"><CalendarDays className="h-4 w-4" /> Request Move-Out</p>
                                <p className="text-[10px] text-white/60">Let your landlord know when you plan to move out.</p>
                                <div>
                                  <label className="text-[10px] text-white/70 font-semibold">Move-out Date *</label>
                                  <input
                                    type="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full mt-0.5 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-white/40"
                                    value={moveOutDate}
                                    onChange={(e) => setMoveOutDate(e.target.value)}
                                  />
                                </div>
                                <textarea
                                  rows={2}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/40 resize-none"
                                  placeholder="Reason for moving out (optional)"
                                  value={moveOutReason}
                                  onChange={(e) => setMoveOutReason(e.target.value)}
                                />
                                {moveOutError && <p className="text-[10px] text-lime-300">{moveOutError}</p>}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setShowMoveOutForm(null); setMoveOutDate(""); setMoveOutReason(""); setMoveOutError(""); }}
                                    className="flex-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleMoveOutSubmit(b.id)}
                                    disabled={submittingMoveOut || !moveOutDate}
                                    className="flex-1 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-white text-[#387a4b] hover:bg-green-100 disabled:opacity-60 transition-colors"
                                  >
                                    {submittingMoveOut ? "Submitting�" : "Submit Request"}
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // Default � show button
                          return (
                            <button
                              onClick={() => { setShowMoveOutForm(b.id); setMoveOutError(""); setMoveOutDate(""); setMoveOutReason(""); }}
                              className="self-start text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                            >
                              <CalendarDays className="h-3.5 w-3.5" /> Request Move-Out
                            </button>
                          );
                        })()}
                      </div>
                    )}
                    {b.status === "Rejected" && (
                      <div className="flex items-center gap-2 bg-lime-500/20 border border-lime-400/30 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-lime-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-lime-800 font-semibold">
                          This booking was not approved. You may apply for another property.
                        </p>
                      </div>
                    )}
                    {b.status === "Pending" && (
                      <div className="flex items-center justify-between gap-2 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-yellow-800 font-semibold">
                            Waiting for landlord review. You&apos;ll be notified once a decision is made.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancel(b.id, b.status)}
                          disabled={cancelling === b.id}
                          className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-lime-500 text-white hover:bg-lime-600 disabled:opacity-60 transition-colors"
                        >
                          {cancelling === b.id ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    )}
                    {b.status === "Cancelled" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <p className="text-xs text-white/60 font-semibold">
                            You cancelled this booking request.
                          </p>
                        </div>

                        {/* Refund section for confirmed GCash payments */}
                        {b.payment_method === "GCash" && (() => {
                          const refund = refunds.find((r) => r.booking_id === b.id);
                          const refundStatusStyle: Record<string, string> = {
                            Pending:    "bg-yellow-100 border-yellow-300 text-yellow-800",
                            Processing: "bg-blue-100 border-blue-300 text-blue-800",
                            Processed:  "bg-green-100 border-green-300 text-green-800",
                            Denied:     "bg-lime-100 border-lime-300 text-lime-800",
                          };
                          if (refund) {
                            return (
                              <div className={`rounded-lg border px-3 py-2.5 ${refundStatusStyle[refund.status]}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-extrabold">
                                    Refund {refund.status}
                                  </p>
                                </div>
                                <p className="text-[10px] opacity-80">
                                  {refund.status === "Pending"    && "Your refund request has been submitted. The landlord will review it shortly."}
                                  {refund.status === "Processing" && `The landlord is processing your ${refund.payment_method} refund.`}
                                  {refund.status === "Processed"  && `Your refund has been sent via ${refund.payment_method}. Please check your account.`}
                                  {refund.status === "Denied"     && "Your refund request was denied."}
                                </p>
                                {refund.landlord_note && (
                                  <p className="text-[10px] mt-1 italic opacity-70">Note: &quot;{refund.landlord_note}&quot;</p>
                                )}
                                {refund.refund_proof_url && (
                                  <a
                                    href={refund.refund_proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/20 border border-white/30 hover:bg-white/30 transition-colors text-white"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View Transfer Proof
                                  </a>
                                )}
                              </div>
                            );
                          }

                          // Show refund form if open, otherwise show the request button
                          if (showRefundForm === b.id) {
                            return (
                              <div className="bg-white/10 border border-white/20 rounded-lg p-3 flex flex-col gap-2">
                                <p className="flex items-center gap-1.5 text-xs font-extrabold text-white"><RotateCcw className="h-4 w-4" /> Request a Refund</p>
                                <p className="text-[10px] text-white/60">
                                  Since your {b.payment_method} payment was confirmed, you may request a refund.
                                </p>
                                <textarea
                                  rows={2}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/40 resize-none"
                                  placeholder="Reason for refund (optional)"
                                  value={refundReason}
                                  onChange={(e) => setRefundReason(e.target.value)}
                                />
                                {refundError && <p className="text-[10px] text-lime-300">{refundError}</p>}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setShowRefundForm(null); setRefundReason(""); setRefundError(""); }}
                                    className="flex-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10"
                                  >
                                    Skip
                                  </button>
                                  <button
                                    onClick={() => handleRefundSubmit(b.id)}
                                    disabled={submittingRefund}
                                    className="flex-1 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-white text-[#387a4b] hover:bg-green-100 disabled:opacity-60 transition-colors"
                                  >
                                    {submittingRefund ? "Submitting�" : "Submit Request"}
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // No refund yet and form not open � show button if receipt was uploaded
                          return b.payment_receipt_url ? (
                            <button
                              onClick={() => { setShowRefundForm(b.id); setRefundError(""); }}
                              className="self-start text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Request Refund
                            </button>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
