"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";

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
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  created_at: string;
  properties: {
    title: string;
    location: string;
    price: string;
    images: string[];
  };
};

type Notification = { id: string; message: string; type: string; is_read: boolean; created_at: string };

const statusStyle: Record<string, string> = {
  Pending:   "bg-yellow-100 text-yellow-700",
  Approved:  "bg-green-100 text-green-700",
  Rejected:  "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

const statusIcon: Record<string, string> = {
  Pending:   "🕐",
  Approved:  "✅",
  Rejected:  "❌",
  Cancelled: "🚫",
};

export default function BookingsPage() {
  const router = useRouter();
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
  }, [router]);

  async function markAllRead() {
    if (!session) return;
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.email }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleCancel(id: string, currentStatus: string) {
    const msg = currentStatus === "Approved"
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
    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => b.id === id ? { ...b, status: "Cancelled" as Booking["status"] } : b)
      );
    }
  }

  const counts = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === "Pending").length,
    approved:  bookings.filter((b) => b.status === "Approved").length,
    rejected:  bookings.filter((b) => b.status === "Rejected").length,
    cancelled: bookings.filter((b) => b.status === "Cancelled").length,
  };

  return (
    <main className="min-h-screen bg-[#800000]">

      {/* ── Document viewer modal ── */}
      {docModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeDocModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-extrabold text-gray-800">{docModal.name}</p>
              <div className="flex items-center gap-3">
                {docSignedUrl && (
                  <a href={docSignedUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Open in new tab ↗</a>
                )}
                <button onClick={closeDocModal} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
              {docLoading && (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  <p className="text-xs">Loading document…</p>
                </div>
              )}
              {!docLoading && docError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-4 py-3">{docError}</p>
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
            <h1 className="text-2xl font-extrabold text-gray-800">My Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">Track all your rental booking requests</p>
          </div>
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs((v) => !v); if (!showNotifs) markAllRead(); }}
              className="relative w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-11 w-72 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <p className="text-xs font-extrabold text-gray-800">Notifications</p>
                  <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No notifications yet.</p>
                  ) : notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b last:border-0 ${n.is_read ? "" : "bg-blue-50"}`}>
                      <p className="text-xs text-gray-700">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
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
              { label: "Total",     value: counts.total,     color: "bg-gray-800 text-white" },
              { label: "Pending",   value: counts.pending,   color: "bg-yellow-400 text-yellow-900" },
              { label: "Approved",  value: counts.approved,  color: "bg-green-500 text-white" },
              { label: "Rejected",  value: counts.rejected,  color: "bg-red-500 text-white" },
              { label: "Cancelled", value: counts.cancelled, color: "bg-gray-400 text-white" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 text-center shadow-sm ${s.color}`}>
                <p className="text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs font-semibold mt-0.5 opacity-90">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Booking list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-4 flex gap-4 animate-pulse">
                <div className="w-24 h-20 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
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
              <div key={b.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row">

                  {/* Property image */}
                  <div className="relative w-full sm:w-36 h-40 sm:h-auto shrink-0 bg-gray-100">
                    {b.properties?.images?.[0] ? (
                      <Image
                        src={b.properties.images[0]}
                        alt={b.properties.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 144px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                    <div>
                      {/* Title + status */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-gray-800 leading-tight">
                          {b.properties?.title ?? "—"}
                        </h3>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusStyle[b.status]}`}>
                          {statusIcon[b.status]} {b.status}
                        </span>
                      </div>

                      {/* Location + price */}
                      <div className="flex items-center gap-1 mt-1 text-gray-400">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[11px] text-gray-500">{b.properties?.location ?? "—"}</span>
                        <span className="text-gray-300 mx-1">•</span>
                        <span className="text-[11px] font-bold text-gray-700">{b.properties?.price ?? "—"}</span>
                      </div>
                    </div>

                    {/* Booking info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Move-in Date</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">
                          {new Date(b.move_in_date).toLocaleDateString("en-US", {
                            month: "long", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.move_out_date && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Move-out Date</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">
                            {new Date(b.move_out_date).toLocaleDateString("en-US", {
                              month: "long", day: "numeric", year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                      {b.lease_duration && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Lease Duration</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{b.lease_duration}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Submitted</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">
                          {new Date(b.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.occupants != null && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Occupants</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{b.occupants} person{b.occupants !== 1 ? "s" : ""}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Payment</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">{b.payment_method ?? "—"}</p>
                      </div>
                      {b.employment_status && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Employment</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{b.employment_status}</p>
                        </div>
                      )}
                      {b.contact_method && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Contact via</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{b.contact_method}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Booked by</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">{b.user_name}</p>
                      </div>
                    </div>

                    {/* Introduction */}
                    {b.introduction && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                        <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-0.5">About the Tenant</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{b.introduction}</p>
                      </div>
                    )}

                    {/* Message */}
                    {b.message && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Your Message</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{b.message}</p>
                      </div>
                    )}

                    {/* Documents */}
                    {(b.gov_id_url || b.income_proof_url || b.payment_receipt_url) && (
                      <div className="flex flex-wrap gap-2">
                        {b.gov_id_url && (
                          <button
                            onClick={() => openDocModal("Government ID", b.gov_id_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            🪪 View Government ID
                          </button>
                        )}
                        {b.income_proof_url && (
                          <button
                            onClick={() => openDocModal("Income Proof", b.income_proof_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            📄 View Income Proof
                          </button>
                        )}
                        {b.payment_receipt_url && (
                          <button
                            onClick={() => openDocModal("Payment Receipt", b.payment_receipt_url!)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            💳 View Receipt
                          </button>
                        )}
                      </div>
                    )}

                    {/* Payment receipt upload — only for approved GCash/Bank Transfer bookings */}
                    {b.status === "Approved" && ["GCash", "Bank Transfer"].includes(b.payment_method) && (
                      <div className={`rounded-xl border px-4 py-3 ${b.payment_confirmed ? "bg-green-50 border-green-200" : b.payment_receipt_url ? "bg-purple-50 border-purple-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs font-extrabold text-gray-800">
                              {b.payment_confirmed
                                ? "💰 Payment Confirmed"
                                : b.payment_receipt_url
                                ? "📎 Receipt Submitted — Awaiting Confirmation"
                                : `💳 Upload ${b.payment_method} Receipt`}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {b.payment_confirmed
                                ? "Your payment has been verified by the landlord."
                                : b.payment_receipt_url
                                ? "The landlord will review your payment screenshot."
                                : "Please upload your payment screenshot so the landlord can verify it."}
                            </p>
                            {receiptError[b.id] && (
                              <p className="text-[10px] text-red-500 mt-1">{receiptError[b.id]}</p>
                            )}
                          </div>
                          {!b.payment_confirmed && (
                            <label className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${uploadingReceipt === b.id ? "opacity-60 cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-800 text-white hover:bg-gray-700"}`}>
                              {uploadingReceipt === b.id ? "Uploading…" : b.payment_receipt_url ? "Re-upload" : "Upload Receipt"}
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
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-green-700 font-semibold">
                          Approved! The landlord will contact you soon.
                        </p>
                      </div>
                    )}
                    {b.status === "Rejected" && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-red-600 font-semibold">
                          This booking was not approved. You may apply for another property.
                        </p>
                      </div>
                    )}
                    {b.status === "Pending" && (
                      <div className="flex items-center justify-between gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-yellow-700 font-semibold">
                            Waiting for landlord review. You&apos;ll be notified once a decision is made.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancel(b.id, b.status)}
                          disabled={cancelling === b.id}
                          className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                        >
                          {cancelling === b.id ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    )}
                    {b.status === "Cancelled" && (
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <p className="text-xs text-gray-500 font-semibold">
                          You cancelled this booking request.
                        </p>
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
