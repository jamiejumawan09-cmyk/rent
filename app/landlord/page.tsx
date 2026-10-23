"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getSession, clearSession } from "@/lib/session";
import { Check, ChevronLeft, ChevronRight, Eye, FileText, LogOut, Upload, X } from "lucide-react";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

// -- Types --------------------------------------------------
type Property = {
  id: string; title: string; location: string; price: string;
  status: string; description: string; images: string[];
  beds?: number; baths?: number; sqm?: number;
  latitude?: number; longitude?: number;
  amenities?: string[];
};

type Booking = {
  id: string; user_name: string; user_email: string;
  move_in_date: string; message: string; payment_method: string; status: string; created_at: string;
  gov_id_url?: string | null; income_proof_url?: string | null;
  payment_receipt_url?: string | null; payment_confirmed?: boolean; moved_in?: boolean;
  properties: { id: string; title: string; location: string; price: string; images: string[] };
};

const emptyForm = {
  title: "", location: "", price: "", status: "Available",
  description: "", beds: "", baths: "", sqm: "", amenities: "",
};

const emptyLatLng = { lat: null as number | null, lng: null as number | null };

const statusColor: Record<string, string> = {
  Available:   "bg-green-100 text-green-800 border border-green-300",
  Booked:      "bg-blue-100 text-blue-800 border border-blue-300",
  Maintenance: "bg-yellow-100 text-yellow-800 border border-yellow-300",
};

const bookingStatusColor: Record<string, string> = {
  Pending:   "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Approved:  "bg-green-100 text-green-800 border border-green-300",
  Rejected:  "bg-lime-100 text-lime-800 border border-lime-300",
  Cancelled: "bg-gray-100 text-gray-700 border border-gray-200",
};


const navItems = [
  { key: "dashboard", label: "Dashboard",   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { key: "listings",  label: "My Listings", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
  { key: "bookings",  label: "Bookings",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { key: "calendar",  label: "Calendar",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { key: "revenue",   label: "Revenue",     icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: "messages",  label: "Messages",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
  { key: "admin-chat", label: "Admin Chat",  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  { key: "refunds",   label: "Refunds",     icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg> },
];

// -- Shared form fields -------------------------------------
function PropertyFields({
  f, setF, existingImgs, onRemoveExisting, newPreviews, onRemoveNew, onAddImages, fileRef,
}: {
  f: typeof emptyForm; setF: (v: typeof emptyForm) => void;
  existingImgs?: string[]; onRemoveExisting?: (i: number) => void;
  newPreviews: string[]; onRemoveNew: (i: number) => void;
  onAddImages: (files: FileList | null) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      {(["title", "price"] as const).map((field) => (
        <div key={field}>
          <label className="text-xs font-semibold text-white capitalize">{field} *</label>
          <input
            className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 border-white/20 bg-white/10 text-white placeholder-white/30"
            value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })}
            placeholder={field === "price" ? "e.g. ?25,000/mo" : ""}
          />
        </div>
      ))}
      {f.location && (
        <div>
          <label className="text-xs font-semibold text-white">Location (from map)</label>
          <p className="text-xs text-white border border-white/20 rounded px-2 py-1.5 mt-0.5 bg-white/10 truncate">{f.location}</p>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-white">Status</label>
        <select className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 border-white/20 bg-white/10 text-white" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option className="text-gray-900">Available</option><option className="text-gray-900">Booked</option><option className="text-gray-900">Maintenance</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["beds", "baths", "sqm"] as const).map((field) => (
          <div key={field}>
            <label className="text-xs font-semibold text-white capitalize">{field}</label>
            <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 border-white/20 bg-white/10 text-white" value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold text-white">Description</label>
        <textarea rows={3} className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 resize-none bg-white/10 text-white placeholder-white/30" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Describe the property..." />
      </div>
      <div>
        <label className="text-xs font-semibold text-white mb-2 block">Amenities</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            "WiFi","Air Conditioning","Parking","Swimming Pool",
            "Security Guard","CCTV","Generator","Water 24/7",
            "Laundry Area","Kitchen","Furnished","Pet Friendly",
          ].map((a) => {
            const selected = f.amenities ? f.amenities.split(",").map((s: string) => s.trim()).filter(Boolean).includes(a) : false;
            return (
              <label key={a} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${selected ? "bg-white/20 border-white/40 text-white font-semibold" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                <input
                  type="checkbox"
                  className="accent-white w-3 h-3"
                  checked={selected}
                  onChange={() => {
                    const arr = f.amenities ? f.amenities.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                    const next = selected ? arr.filter((x: string) => x !== a) : [...arr, a];
                    setF({ ...f, amenities: next.join(",") });
                  }}
                />
                {a}
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-white/80">Images</label>
        {existingImgs && existingImgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 mt-1">
            {existingImgs.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border group">
                <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                <button type="button" onClick={() => onRemoveExisting?.(i)} aria-label="Remove image" className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-0.5 border-2 border-dashed border-white/30 rounded-lg p-3 text-center cursor-pointer hover:border-white/60 transition-colors" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onAddImages(e.dataTransfer.files); }}>
          <p className="text-xs text-white">Click or drag & drop images</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAddImages(e.target.files)} />
        </div>
        {newPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {newPreviews.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border group">
                <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                <button type="button" onClick={() => onRemoveNew(i)} aria-label="Remove image" className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// -- Main component -----------------------------------------
export default function LandlordDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [userName, setUserName]   = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Add modal
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState(emptyForm);
  const [addLatLng, setAddLatLng]     = useState(emptyLatLng);
  const [addFiles, setAddFiles]       = useState<File[]>([]);
  const [addPreviews, setAddPreviews] = useState<string[]>([]);
  const [addSaving, setAddSaving]     = useState(false);
  const [addError, setAddError]       = useState("");
  const addFileRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editProp, setEditProp]           = useState<Property | null>(null);
  const [editForm, setEditForm]           = useState(emptyForm);
  const [editLatLng, setEditLatLng]       = useState(emptyLatLng);
  const [editExisting, setEditExisting]   = useState<string[]>([]);
  const [editFiles, setEditFiles]         = useState<File[]>([]);
  const [editPreviews, setEditPreviews]   = useState<string[]>([]);
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  // Booking filter
  const [bookingFilter, setBookingFilter] = useState("All");
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [markingMovedIn, setMarkingMovedIn] = useState<string | null>(null);

  // Document viewer modal
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

  // Messages inbox
  type Thread = { property_id: string; property_title: string; tenant_email: string; tenant_name: string; last_message: string; last_at: string; unread: number };
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [threadMessages, setThreadMessages] = useState<{id:string;sender_email:string;sender_name:string;content:string;created_at:string}[]>([]);
  const [threadMsg, setThreadMsg] = useState("");
  const [sendingThreadMsg, setSendingThreadMsg] = useState(false);

  // Refunds
  type RefundRequest = {
    id: string; booking_id: string; tenant_email: string; tenant_name: string;
    property_id: string; payment_method: string; reason?: string | null;
    status: "Pending" | "Processing" | "Processed" | "Denied";
    landlord_note?: string | null; refund_proof_url?: string | null;
    created_at: string; resolved_at?: string | null;
    properties?: { title: string; landlord_email: string; landlord_name: string };
  };
  const [refunds, setRefunds]                   = useState<RefundRequest[]>([]);
  const [refundFilter, setRefundFilter]         = useState("All");
  const [updatingRefund, setUpdatingRefund]     = useState<string | null>(null);
  const [refundNote, setRefundNote]             = useState<Record<string, string>>({});
  const [refundProof, setRefundProof]           = useState<Record<string, File>>({});

  // Admin direct chat
  const [adminChatMessages, setAdminChatMessages] = useState<{id:string;sender_email:string;sender_name:string;content:string;created_at:string}[]>([]);
  const [adminChatMsg, setAdminChatMsg]           = useState("");
  const [sendingAdminChat, setSendingAdminChat]   = useState(false);
  const [adminList, setAdminList]                 = useState<{email:string;name:string}[]>([]);
  const [activeAdmin, setActiveAdmin]             = useState<{email:string;name:string} | null>(null);
  const [adminChatUnread, setAdminChatUnread]     = useState(0);
  const adminChatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    setUserName(s.name || s.email);
    setUserEmail(s.email);
  }, [router]);

  useEffect(() => {
    if (!userEmail) return;
    fetch(`/api/landlord/properties?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json()).then((d) => { setProperties(Array.isArray(d) ? d : []); setLoadingProps(false); });
    fetch(`/api/landlord/bookings?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json()).then((d) => { setBookings(Array.isArray(d) ? d : []); setLoadingBooks(false); });
    fetch(`/api/landlord/messages?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json()).then((d) => setThreads(Array.isArray(d) ? d : []));
    fetch(`/api/refunds?email=${encodeURIComponent(userEmail)}&role=landlord`)
      .then((r) => r.json()).then((d) => setRefunds(Array.isArray(d) ? d : []));
    // Load admin list and unread admin chat count
    fetch("/api/users?role=admin")
      .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setAdminList(d.filter((u: {role:string}) => u.role === "admin").map((u: {email:string;name:string}) => ({ email: u.email, name: u.name }))); });
    fetch(`/api/admin/messages?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setAdminChatUnread(d.reduce((s: number, t: {unread:number}) => s + (t.unread ?? 0), 0)); });
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || !activeAdmin) {
      setAdminChatMessages([]);
      return;
    }
    let active = true;
    (async () => {
      const res = await fetch(`/api/admin/messages?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(activeAdmin.email)}`);
      const data = await res.json();
      if (!active) return;
      setAdminChatMessages(Array.isArray(data) ? data : []);
      const threadsRes = await fetch(`/api/admin/messages?email=${encodeURIComponent(userEmail)}`);
      const threads = await threadsRes.json();
      if (active && Array.isArray(threads)) {
        setAdminChatUnread(threads.reduce((sum: number, thread: { unread?: number }) => sum + (thread.unread ?? 0), 0));
      }
    })().catch(() => { if (active) setAdminChatMessages([]); });
    return () => { active = false; };
  }, [activeAdmin, userEmail]);

  useEffect(() => {
    adminChatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [adminChatMessages]);

  async function handleSendAdminChat(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAdmin || !adminChatMsg.trim() || !userEmail || sendingAdminChat) return;
    setSendingAdminChat(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_email: userEmail,
          sender_name: userName,
          receiver_email: activeAdmin.email,
          content: adminChatMsg.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not send the message.");
        return;
      }
      setAdminChatMessages((messages) => [...messages, data]);
      setAdminChatMsg("");
    } catch {
      alert("Could not send the message. Check your connection and try again.");
    } finally {
      setSendingAdminChat(false);
    }
  }

  async function loadThreadMessages(t: typeof activeThread) {
    if (!t || !userEmail) return;
    const res = await fetch(`/api/messages?property_id=${t.property_id}&email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    if (Array.isArray(data)) setThreadMessages(data);
  }

  async function handleSendThreadMsg(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !threadMsg.trim() || !userEmail) return;
    setSendingThreadMsg(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: activeThread.property_id, sender_email: userEmail, sender_name: userName, receiver_email: activeThread.tenant_email, content: threadMsg }),
    });
    setThreadMsg("");
    setSendingThreadMsg(false);
    loadThreadMessages(activeThread);
  }

  // -- Helpers ---------------------------------------------
  function addImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setAddFiles((p) => [...p, ...arr]);
    setAddPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }
  function removeAddImage(i: number) {
    setAddFiles((p) => p.filter((_, j) => j !== i));
    setAddPreviews((p) => p.filter((_, j) => j !== i));
  }
  function editImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setEditFiles((p) => [...p, ...arr]);
    setEditPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }
  function removeEditNewImage(i: number) {
    setEditFiles((p) => p.filter((_, j) => j !== i));
    setEditPreviews((p) => p.filter((_, j) => j !== i));
  }

  function openEdit(p: Property) {
    setEditProp(p);
    setEditForm({ title: p.title, location: p.location, price: p.price, status: p.status, description: p.description ?? "", beds: p.beds != null ? String(p.beds) : "", baths: p.baths != null ? String(p.baths) : "", sqm: p.sqm != null ? String(p.sqm) : "", amenities: Array.isArray(p.amenities) ? p.amenities.join(",") : "" });
    setEditLatLng({ lat: p.latitude ?? null, lng: p.longitude ?? null });
    setEditExisting(p.images ?? []);
    setEditFiles([]); setEditPreviews([]); setEditError("");
  }

  // -- CRUD ------------------------------------------------
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.title || !addForm.price) { setAddError("Title and price are required."); return; }
    setAddSaving(true); setAddError("");
    const fd = new FormData();
    fd.append("landlord_email", userEmail);
    fd.append("landlord_name", userName);
    // Submit as Pending � admin must approve before it goes live
    Object.entries({ ...addForm, status: "Pending" }).forEach(([k, v]) => { if (k !== "amenities") fd.append(k, v as string); });
    fd.append("amenities", JSON.stringify(addForm.amenities ? addForm.amenities.split(",").map(s => s.trim()).filter(Boolean) : []));
    if (addLatLng.lat != null) fd.append("latitude", String(addLatLng.lat));
    if (addLatLng.lng != null) fd.append("longitude", String(addLatLng.lng));
    addFiles.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/landlord/properties", { method: "POST", body: fd });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error); return; }
    setProperties((p) => [data, ...p]);
    setShowAdd(false); setAddForm(emptyForm); setAddLatLng(emptyLatLng); setAddFiles([]); setAddPreviews([]);
    alert("Listing submitted! It will go live after admin approval.");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProp || !editForm.title || !editForm.price) { setEditError("Title and price are required."); return; }
    setEditSaving(true); setEditError("");
    const fd = new FormData();
    fd.append("id", editProp.id);
    fd.append("landlord_email", userEmail);
    Object.entries(editForm).forEach(([k, v]) => { if (k !== "amenities") fd.append(k, v as string); });
    fd.append("amenities", JSON.stringify(editForm.amenities ? editForm.amenities.split(",").map(s => s.trim()).filter(Boolean) : []));
    if (editLatLng.lat != null) fd.append("latitude", String(editLatLng.lat));
    if (editLatLng.lng != null) fd.append("longitude", String(editLatLng.lng));
    fd.append("existingImages", JSON.stringify(editExisting));
    editFiles.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/landlord/properties", { method: "PATCH", body: fd });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error); return; }
    setProperties((p) => p.map((x) => x.id === editProp.id ? data : x));
    setEditProp(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing?")) return;
    const res = await fetch("/api/landlord/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, landlord_email: userEmail }) });
    if (res.ok) setProperties((p) => p.filter((x) => x.id !== id));
  }

  async function handleBookingAction(id: string, status: string) {
    setUpdatingBooking(id);
    const res = await fetch("/api/landlord/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, landlord_email: userEmail }) });
    const data = await res.json();
    setUpdatingBooking(null);
    if (!res.ok) { alert(data.error ?? "Failed to update booking."); return; }
    setBookings((b) => b.map((x) => x.id === id ? { ...x, status } : x));
  }

  async function handleConfirmPayment(id: string) {
    if (!confirm("Confirm this payment? The tenant will be notified.")) return;
    setConfirmingPayment(id);
    const res = await fetch("/api/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, landlord_email: userEmail, confirm: true }),
    });
    setConfirmingPayment(null);
    if (res.ok) setBookings((b) => b.map((x) => x.id === id ? { ...x, payment_confirmed: true } : x));
  }

  async function handleMarkMovedIn(id: string) {
    if (!confirm("Mark this tenant as moved in? They will be notified.")) return;
    setMarkingMovedIn(id);
    const res = await fetch("/api/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, landlord_email: userEmail, mark_moved_in: true, role: "landlord" }),
    });
    setMarkingMovedIn(null);
    if (res.ok) setBookings((b) => b.map((x) => x.id === id ? { ...x, moved_in: true } : x));
    else { const d = await res.json(); alert(d.error ?? "Failed to mark move-in."); }
  }

  // -- Derived stats ----------------------------------------
  const pendingBookings  = bookings.filter((b) => b.status === "Pending").length;
  const approvedBookings = bookings.filter((b) => b.status === "Approved").length;
  const availableProps   = properties.filter((p) => p.status === "Available").length;
  const filteredBookings = bookingFilter === "All" ? bookings : bookings.filter((b) => b.status === bookingFilter);
  const pendingRefunds   = refunds.filter((r) => r.status === "Pending").length;

  async function handleRefundAction(id: string, status: "Processing" | "Processed" | "Denied") {
    setUpdatingRefund(id);
    const fd = new FormData();
    fd.append("id", id);
    fd.append("status", status);
    fd.append("actor_email", userEmail);
    fd.append("role", "landlord");
    fd.append("landlord_note", refundNote[id]?.trim() ?? "");
    // Attach proof screenshot only when marking as Processed
    if (status === "Processed" && refundProof[id]) {
      fd.append("proof", refundProof[id]);
    }
    const res = await fetch("/api/refunds", { method: "PATCH", body: fd });
    setUpdatingRefund(null);
    if (res.ok) {
      const data = await res.json();
      setRefunds((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
      setRefundNote((n) => { const c = { ...n }; delete c[id]; return c; });
      setRefundProof((n) => { const c = { ...n }; delete c[id]; return c; });
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to update refund.");
    }
  }

  // Revenue per month from approved bookings
  const revenueByMonth: Record<string, number> = {};
  bookings.filter((b) => b.status === "Approved").forEach((b) => {
    const month = new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const price = Number((b.properties?.price ?? "").replace(/[^0-9]/g, ""));
    revenueByMonth[month] = (revenueByMonth[month] ?? 0) + (isNaN(price) ? 0 : price);
  });
  const revenueRows = Object.entries(revenueByMonth).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  const totalRevenue = revenueRows.reduce((s, [, v]) => s + v, 0);

  // Calendar: approved bookings grouped by date
  const calendarDates: Record<string, { title: string; tenant: string }[]> = {};
  bookings.filter((b) => b.status === "Approved").forEach((b) => {
    const d = b.move_in_date.slice(0, 10);
    if (!calendarDates[d]) calendarDates[d] = [];
    calendarDates[d].push({ title: b.properties?.title ?? "�", tenant: b.user_name });
  });
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const calDays = (() => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  })();

  return (
    <div className="flex min-h-screen bg-[#387a4b]">

      {/* -- Document viewer modal -- */}
      {docModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeDocModal}>
          <div className="bg-[#315f40] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-extrabold text-white">{docModal.name}</p>
              <div className="flex items-center gap-3">
                {docSignedUrl && (
                  <a href={docSignedUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-200 hover:underline">Open in new tab</a>
                )}
                <button onClick={closeDocModal} aria-label="Close" className="text-white/50 hover:text-white/70"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {docLoading && (
                <div className="flex flex-col items-center gap-2 text-white/50">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  <p className="text-xs">Loading document�</p>
                </div>
              )}
              {!docLoading && docError && (
                <p className="text-xs text-lime-500 bg-red-50 border border-red-200 rounded px-4 py-3">{docError}</p>
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

      {/* -- Sidebar -- */}
      <aside className="w-56 bg-[#dceedd] text-[#244b30] flex flex-col shrink-0 border-r border-green-200">
        <div className="px-5 py-5 border-b border-green-200">
          <span className="text-lg font-extrabold">HOME<span className="text-lime-500">R</span><span className="text-lime-500 italic">ent</span></span>
          <p className="text-[10px] text-[#64806a] mt-0.5">Landlord Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => setActiveNav(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeNav === item.key ? "bg-[#c8e2cc] text-[#244b30]" : "text-[#52735a] hover:bg-[#e8f4e9] hover:text-[#244b30]"}`}>
              {item.icon}{item.label}
              {item.key === "bookings" && pendingBookings > 0 && (
                <span className="ml-auto bg-lime-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingBookings}</span>
              )}
              {item.key === "refunds" && pendingRefunds > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingRefunds}</span>
              )}
              {item.key === "admin-chat" && adminChatUnread > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{adminChatUnread}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-green-200">
          <div className="flex items-center gap-2 px-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#bad9bf] flex items-center justify-center text-[#315f40] text-xs font-bold">{userName.charAt(0).toUpperCase()}</div>
            <span className="text-xs text-[#52735a] truncate">{userName}</span>
          </div>
          <button onClick={() => { clearSession(); router.push("/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#52735a] hover:bg-[#e8f4e9] hover:text-[#244b30] transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* -- Main -- */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-white capitalize">{activeNav === "listings" ? "My Listings" : activeNav}</h1>
          <span className="text-sm text-white/60">Welcome, <span className="font-semibold text-white/80 capitalize">{userName}</span></span>
        </div>

        <div className="p-6">

          {/* -- Dashboard -- */}
          {activeNav === "dashboard" && (
            <div className="flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "My Listings",      value: properties.length, icon: "🏠", color: "bg-white/20" },
                  { label: "Available",         value: availableProps,    icon: "✅", color: "bg-white/20" },
                  { label: "Pending Requests",  value: pendingBookings,   icon: "🕐", color: "bg-white/20" },
                  { label: "Approved Leases",   value: approvedBookings,  icon: "📋", color: "bg-white/20" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-white">{s.value}</p>
                    <p className="text-xs text-white/70 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent bookings */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-white mb-4">Recent Booking Requests</h2>
                {loadingBooks ? <p className="text-xs text-white/50">Loading...</p> : bookings.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">No booking requests yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/10 rounded-lg">
                          <th className="text-left py-2.5 px-3 font-bold text-white/70 rounded-l-lg">Tenant</th>
                          <th className="text-left py-2.5 px-3 font-bold text-white/70">Property</th>
                          <th className="text-left py-2.5 px-3 font-bold text-white/70">Move-in</th>
                          <th className="text-left py-2.5 px-3 font-bold text-white/70 rounded-r-lg">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.slice(0, 5).map((b, i) => (
                          <tr key={b.id} className={`border-b border-white/10 last:border-0 ${i % 2 === 0 ? "bg-white/5" : ""}`}>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-white">{b.user_name}</p>
                              <p className="text-white/50 text-[10px]">{b.user_email}</p>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-white/90">{b.properties?.title ?? "�"}</td>
                            <td className="py-2.5 px-3 text-white/80">{new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bookingStatusColor[b.status] ?? "bg-white/10 text-white/70"}`}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent listings */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-white mb-4">My Listings</h2>
                {loadingProps ? <p className="text-xs text-white/50">Loading...</p> : properties.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">No listings yet. Add your first property.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.slice(0, 3).map((p) => (
                      <div key={p.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                        <div className="relative h-32 bg-white/10">
                          {p.images?.[0] ? <Image src={p.images[0]} alt={p.title} fill sizes="200px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">No image</div>}
                          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-white/10 text-white/70"}`}>{p.status}</span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-white truncate">{p.title}</p>
                          <p className="text-[10px] text-white/60 truncate">{p.location}</p>
                          <p className="text-xs font-extrabold text-white mt-1">{p.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -- My Listings -- */}
          {activeNav === "listings" && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-white">All Listings ({properties.length})</h2>
                <button onClick={() => { setShowAdd(true); setAddError(""); }} className="bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-2 rounded-lg hover:bg-white/30">+ Add Listing</button>
              </div>
              {loadingProps ? <p className="text-xs text-white/50">Loading...</p> : properties.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                  <p className="text-sm font-semibold mb-2">No listings yet</p>
                  <button onClick={() => setShowAdd(true)} className="text-xs text-blue-200 hover:underline">Add your first property ?</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/50 border-b">
                      <th className="text-left pb-2 font-semibold">Property</th>
                      <th className="text-left pb-2 font-semibold">Location</th>
                      <th className="text-left pb-2 font-semibold">Price</th>
                      <th className="text-left pb-2 font-semibold">Beds/Baths</th>
                      <th className="text-left pb-2 font-semibold">Status</th>
                      <th className="text-left pb-2 font-semibold">Actions</th>
                    </tr></thead>
                    <tbody>
                      {properties.map((p) => (
                        <tr key={p.id} className="border-b border-white/10 last:border-0">
                          <td className="py-2.5 flex items-center gap-2">
                            {p.images?.[0] && <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"><Image src={p.images[0]} alt={p.title} fill sizes="36px" className="object-cover" /></div>}
                            <span className="font-medium text-white/80 truncate max-w-[120px]">{p.title}</span>
                          </td>
                          <td className="py-2.5 text-white/60 max-w-[100px] truncate">{p.location}</td>
                          <td className="py-2.5 font-semibold text-white/80">{p.price}</td>
                          <td className="py-2.5 text-white/60">{p.beds ?? "�"} / {p.baths ?? "�"}</td>
                          <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[p.status] ?? "bg-white/10 text-white/70"}`}>{p.status}</span></td>
                          <td className="py-2.5">
                            <div className="flex gap-3">
                              <button onClick={() => openEdit(p)} className="text-blue-500 hover:underline font-semibold">Edit</button>
                              <button onClick={() => handleDelete(p.id)} className="text-lime-500 hover:underline font-semibold">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* -- Bookings -- */}
          {activeNav === "bookings" && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-white">Booking Requests ({bookings.length})</h2>
                <select className="border rounded-lg px-3 py-1.5 text-xs bg-white/10 outline-none focus:ring-1 focus:ring-white/40 border-white/20 bg-white/10 text-white" value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}>
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              {loadingBooks ? <p className="text-xs text-white/50">Loading...</p> : filteredBookings.length === 0 ? (
                <p className="text-xs text-white/50 text-center py-8">No {bookingFilter !== "All" ? bookingFilter.toLowerCase() : ""} bookings.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        {/* Property thumbnail */}
                        <div className="relative w-full sm:w-28 h-28 shrink-0 bg-white/10">
                          {b.properties?.images?.[0] ? <Image src={b.properties.images[0]} alt="" fill sizes="112px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">No img</div>}
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                            <div>
                              <p className="text-xs font-extrabold text-white">{b.properties?.title ?? "�"}</p>
                              <p className="text-[10px] text-white/50">{b.properties?.location}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${bookingStatusColor[b.status] ?? "bg-white/10 text-white/70"}`}>{b.status}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            <div><p className="text-[10px] text-white/50 font-semibold uppercase">Tenant</p><p className="text-xs font-semibold text-white/80">{b.user_name}</p><p className="text-[10px] text-white/50">{b.user_email}</p></div>
                            <div><p className="text-[10px] text-white/50 font-semibold uppercase">Move-in</p><p className="text-xs font-semibold text-white/80">{new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                            <div><p className="text-[10px] text-white/50 font-semibold uppercase">Payment</p><p className="text-xs font-semibold text-white/80">{b.payment_method ?? "�"}</p></div>
                          </div>
                          {/* Documents */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {b.gov_id_url ? (
                              <button onClick={() => openDocModal(`Gov ID � ${b.user_name}`, b.gov_id_url!)} className="flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors">
                                <Eye className="h-3.5 w-3.5" /> View Gov ID
                              </button>
                            ) : <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">No Gov ID</span>}
                            {b.income_proof_url ? (
                              <button onClick={() => openDocModal(`Income Proof � ${b.user_name}`, b.income_proof_url!)} className="flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors">
                                <Eye className="h-3.5 w-3.5" /> View Income Proof
                              </button>
                            ) : <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">No Income Proof</span>}
                            {b.payment_receipt_url && (
                              <button onClick={() => openDocModal(`Payment Receipt � ${b.user_name}`, b.payment_receipt_url!)} className="flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-purple-100 border border-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors">
                                <Eye className="h-3.5 w-3.5" /> View Receipt
                              </button>
                            )}
                          </div>
                          {/* Payment confirmation */}
                          {b.status === "Approved" && b.payment_method === "GCash" && (
                            <div className={`rounded-lg border px-3 py-2 mb-3 flex items-center justify-between gap-2 ${b.payment_confirmed ? "bg-green-500/20 border-green-300/30" : b.payment_receipt_url ? "bg-purple-500/20 border-purple-300/30" : "bg-amber-500/20 border-amber-300/30"}`}>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {b.payment_confirmed ? "Payment Confirmed" : b.payment_receipt_url ? "Receipt Uploaded - Verify Payment" : `Awaiting ${b.payment_method} Receipt`}
                                </p>
                                <p className="text-[10px] text-white/60 mt-0.5">
                                  {b.payment_confirmed ? "You have confirmed this payment." : b.payment_receipt_url ? "Review the receipt and confirm if payment is valid." : "Tenant has not uploaded a payment receipt yet."}
                                </p>
                              </div>
                              {!b.payment_confirmed && b.payment_receipt_url && (
                                <button
                                  onClick={() => handleConfirmPayment(b.id)}
                                  disabled={confirmingPayment === b.id}
                                  className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                                >
                                  {confirmingPayment === b.id ? "..." : <><Check className="h-3.5 w-3.5 inline" /> Confirm Payment</>}
                                </button>
                              )}
                            </div>
                          )}
                          {b.message && <p className="text-xs text-white/60 bg-white/5 rounded px-2 py-1.5 border border-white/10 mb-3 line-clamp-2">{b.message}</p>}

                          {/* -- Mark as Moved In -- */}
                          {b.status === "Approved" && (
                            <div className={`rounded-lg border px-3 py-2 mb-3 flex items-center justify-between gap-2 ${b.moved_in ? "bg-green-500/20 border-green-400/30" : "bg-blue-500/20 border-blue-400/30"}`}>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {b.moved_in ? "Tenant Moved In" : "Move-In Confirmation"}
                                </p>
                                <p className="text-[10px] text-white/60 mt-0.5">
                                  {b.moved_in
                                    ? `Move-in confirmed on ${new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
                                    : "Confirm when the tenant has physically moved into the property."}
                                </p>
                              </div>
                              {!b.moved_in && (
                                <button
                                  onClick={() => handleMarkMovedIn(b.id)}
                                  disabled={markingMovedIn === b.id}
                                  className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                                >
                                  {markingMovedIn === b.id ? "..." : <><Check className="h-3.5 w-3.5 inline" /> Mark Moved In</>}
                                </button>
                              )}
                            </div>
                          )}

                          {b.status === "Pending" && (
                            <div className="flex gap-2">
                              <button disabled={updatingBooking === b.id} onClick={() => handleBookingAction(b.id, "Approved")} className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-60">
                                {updatingBooking === b.id ? "..." : <><Check className="h-3.5 w-3.5 inline" /> Approve</>}
                              </button>
                              <button disabled={updatingBooking === b.id} onClick={() => handleBookingAction(b.id, "Rejected")} className="bg-lime-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-lime-600 disabled:opacity-60">
                                {updatingBooking === b.id ? "..." : <><X className="h-3.5 w-3.5 inline" /> Reject</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* -- Calendar -- */}
          {activeNav === "calendar" && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-white">Move-in Calendar</h2>
                <div className="flex items-center gap-2">
                  <button aria-label="Previous month" onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-7 h-7 rounded-lg border border-green-300 text-[#315f40] flex items-center justify-center hover:bg-green-100 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-white/80">{calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <button aria-label="Next month" onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-7 h-7 rounded-lg border border-green-300 text-[#315f40] flex items-center justify-center hover:bg-green-100 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-white/50 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calDays.firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: calDays.daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calDays.year}-${String(calDays.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const events = calendarDates[dateStr];
                  const isToday = new Date().toISOString().slice(0, 10) === dateStr;
                  return (
                    <div key={day} className={`min-h-[52px] rounded-lg p-1 border text-[10px] ${isToday ? "border-green-500 bg-green-200" : "border-white/10"}`} style={events ? { backgroundColor: "rgba(34,197,94,0.2)", borderColor: "rgba(134,239,172,0.5)" } : {}}>
                      <p className={`font-bold mb-0.5 ${isToday ? "text-green-900" : "text-white/70"}`}>{day}</p>
                      {events?.map((ev, j) => (
                        <p key={j} className="text-[9px] font-semibold text-white bg-green-600/70 rounded px-1 py-0.5 truncate leading-tight mt-0.5">{ev.title}</p>
                      ))}
                    </div>
                  );
                })}
              </div>
              {Object.keys(calendarDates).length === 0 && (
                <p className="text-xs text-white/50 text-center mt-4">No approved move-in dates yet.</p>
              )}
            </div>
          )}

          {/* -- Revenue -- */}
          {activeNav === "revenue" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                  <p className="text-xs text-white/60 mb-1">Total Revenue (Approved)</p>
              <p className="text-2xl font-extrabold text-white">PHP {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                  <p className="text-xs text-white/60 mb-1">Approved Bookings</p>
                  <p className="text-2xl font-extrabold text-white">{approvedBookings}</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-white mb-4">Monthly Revenue</h2>
                {revenueRows.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">No approved bookings yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {revenueRows.map(([month, amount]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-white/70 w-24 shrink-0">{month}</span>
                        <div className="flex-1 h-5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(amount / (Math.max(...revenueRows.map(([,v]) => v)) || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white w-24 text-right">PHP {amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -- Refunds -- */}
          {activeNav === "refunds" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-extrabold text-[#244b30]">Refund Requests</h2>
                <div className="flex gap-1 flex-wrap">
                  {["All", "Pending", "Processing", "Processed", "Denied"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setRefundFilter(f)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${refundFilter === f ? "bg-white text-[#244b30] border-green-200" : "border-green-200 text-[#54745b] hover:bg-green-50"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {refunds.filter((r) => refundFilter === "All" || r.status === refundFilter).length === 0 ? (
                <div className="bg-white border border-green-200 rounded-xl p-10 text-center">
                  <FileText className="h-7 w-7 mx-auto mb-2 text-[#64806a]" />
                  <p className="text-sm font-semibold text-[#244b30]">No refund requests</p>
                  <p className="text-xs text-[#64806a] mt-1">Refund requests from tenants will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {refunds
                    .filter((r) => refundFilter === "All" || r.status === refundFilter)
                    .map((r) => {
                      const statusStyle: Record<string, string> = {
                        Pending:    "bg-amber-100 border-amber-300 text-amber-900",
                        Processing: "bg-blue-100 border-blue-300 text-blue-900",
                        Processed:  "bg-green-100 border-green-300 text-green-900",
                        Denied:     "bg-rose-100 border-rose-300 text-rose-900",
                      };
                      return (
                        <div key={r.id} className="bg-white border border-green-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-sm font-extrabold text-[#244b30]">{r.tenant_name}</p>
                              <p className="text-[10px] text-[#64806a]">{r.tenant_email}</p>
                              <p className="text-xs text-[#54745b] mt-0.5">
                                {(r.properties as { title?: string } | null)?.title ?? "�"} � {r.payment_method}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusStyle[r.status]}`}>
                              {r.status}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold">Submitted</p>
                              <p className="text-[#244b30] mt-0.5">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                            </div>
                            {r.resolved_at && (
                              <div>
                                <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold">Resolved</p>
                                <p className="text-[#244b30] mt-0.5">{new Date(r.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                              </div>
                            )}
                          </div>

                          {r.reason && (
                            <div className="bg-[#f6fbf6] rounded-lg px-3 py-2 border border-green-100">
                              <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold mb-0.5">Tenant&apos;s Reason</p>
                              <p className="text-xs text-[#244b30]">{r.reason}</p>
                            </div>
                          )}

                          {/* Action area � only for Pending/Processing */}
                          {(r.status === "Pending" || r.status === "Processing") && (
                            <div className="flex flex-col gap-2 pt-1 border-t border-green-100">
                              <input
                                className="w-full bg-[#f6fbf6] border border-green-200 rounded-lg px-3 py-2 text-xs text-[#244b30] placeholder-[#78917e] outline-none focus:ring-1 focus:ring-green-300"
                                placeholder="Add a note to the tenant (optional)"
                                value={refundNote[r.id] ?? ""}
                                onChange={(e) => setRefundNote((n) => ({ ...n, [r.id]: e.target.value }))}
                              />
                              {/* Proof of refund upload � shown for Processed action */}
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#54745b] hover:text-[#244b30] transition-colors">
                                <span className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 font-bold hover:bg-green-100 transition-colors">
                                  <Upload className="h-3.5 w-3.5" /> {refundProof[r.id] ? refundProof[r.id].name : "Attach GCash Transfer Screenshot (optional)"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setRefundProof((p) => ({ ...p, [r.id]: file }));
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {r.status === "Pending" && (
                                  <button
                                    onClick={() => handleRefundAction(r.id, "Processing")}
                                    disabled={updatingRefund === r.id}
                                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
                                  >
                                    {updatingRefund === r.id ? "..." : "Mark Processing"}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRefundAction(r.id, "Processed")}
                                  disabled={updatingRefund === r.id}
                                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
                                >
                                  {updatingRefund === r.id ? "..." : "Mark Processed"}
                                </button>
                                <button
                                  onClick={() => handleRefundAction(r.id, "Denied")}
                                  disabled={updatingRefund === r.id}
                                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60 transition-colors"
                                >
                                  {updatingRefund === r.id ? "..." : "Deny"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Resolved note and proof */}
                          {(r.status === "Processed" || r.status === "Denied") && (
                            <div className="flex flex-col gap-2">
                              {r.landlord_note && (
                                <div className="bg-[#f6fbf6] rounded-lg px-3 py-2 border border-green-100">
                                  <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold mb-0.5">Your Note</p>
                                  <p className="text-xs text-[#244b30] italic">&quot;{r.landlord_note}&quot;</p>
                                </div>
                              )}
                              {r.status === "Processed" && (
                                r.refund_proof_url ? (
                                  <a
                                    href={r.refund_proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="self-start inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-green-100 border border-green-300 text-green-900 hover:bg-green-200 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View Transfer Proof
                                  </a>
                                ) : (
                                  <p className="text-[10px] text-[#64806a] italic">No transfer screenshot attached.</p>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* -- Messages -- */}
          {activeNav === "messages" && (
            <div className="flex gap-4 h-[calc(100vh-140px)]">
              {/* Thread list */}
              <div className="w-64 shrink-0 rounded-xl border border-green-200 bg-white shadow-sm overflow-y-auto">
                <div className="px-4 py-3 border-b border-green-100">
                  <p className="text-xs font-extrabold text-[#244b30]">Conversations ({threads.length})</p>
                </div>
                {threads.length === 0 ? (
                  <p className="text-xs text-[#64806a] text-center py-8">No messages yet.</p>
                ) : threads.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveThread({ ...t, unread: 0 });
                      setThreads((current) => current.map((thread) =>
                        thread.property_id === t.property_id && thread.tenant_email === t.tenant_email
                          ? { ...thread, unread: 0 }
                          : thread
                      ));
                      loadThreadMessages(t);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-green-100 transition-colors ${activeThread?.tenant_email === t.tenant_email && activeThread?.property_id === t.property_id ? "bg-green-100" : "hover:bg-green-50"}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-[#244b30] truncate">{t.tenant_name}</p>
                      {t.unread > 0 && <span className="w-4 h-4 bg-lime-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">{t.unread}</span>}
                    </div>
                    <p className="text-[10px] text-[#54745b] truncate">{t.property_title}</p>
                    <p className="text-[10px] text-[#78917e] truncate mt-0.5">{t.last_message}</p>
                  </button>
                ))}
              </div>
              {/* Chat pane */}
              <div className="flex-1 rounded-xl border border-green-200 bg-white shadow-sm flex flex-col overflow-hidden">
                {!activeThread ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#64806a]">Select a conversation</div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-green-100">
                      <p className="text-xs font-extrabold text-[#244b30]">{activeThread.tenant_name}</p>
                      <p className="text-[10px] text-[#64806a]">{activeThread.property_title}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                      {threadMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-[#64806a]">No messages yet. Start the conversation!</div>
                      ) : threadMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.sender_email === userEmail ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${m.sender_email === userEmail ? "bg-[#315f40] text-white font-medium" : "bg-[#f1f8f2] border border-green-100 text-[#244b30]"}`}>
                            {m.sender_email !== userEmail && <p className="text-[10px] font-bold mb-0.5 text-[#64806a]">{m.sender_name}</p>}
                            <p>{m.content}</p>
                            <p className={`text-[9px] mt-0.5 ${m.sender_email === userEmail ? "text-white/70 text-right" : "text-[#78917e]"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendThreadMsg} className="px-4 py-3 border-t border-green-100 flex gap-2">
                      <input
                        className="flex-1 border border-green-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-green-300 bg-[#f6fbf6] text-[#244b30] placeholder-[#78917e]"
                        placeholder="Type a message..."
                        value={threadMsg}
                        onChange={(e) => setThreadMsg(e.target.value)}
                      />
                      <button type="submit" disabled={sendingThreadMsg} className="bg-[#315f40] text-white text-xs font-extrabold px-4 py-2 rounded-lg hover:bg-[#244b30] disabled:opacity-60 transition-colors">{sendingThreadMsg ? "..." : "Send"}</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* -- Admin Chat -- */}
          {activeNav === "admin-chat" && (
            <div className="flex gap-4 h-[calc(100vh-140px)] min-h-[360px]">
              <div className="w-64 shrink-0 rounded-xl border border-green-200 bg-white shadow-sm overflow-y-auto">
                <div className="px-4 py-3 border-b border-green-100">
                  <p className="text-xs font-extrabold text-[#244b30]">Administrators</p>
                  <p className="text-[10px] text-[#64806a] mt-0.5">Direct support messages</p>
                </div>
                {adminList.length === 0 ? (
                  <p className="text-xs text-[#64806a] text-center py-8">No administrators found.</p>
                ) : adminList.map((admin) => (
                  <button
                    key={admin.email}
                    onClick={() => setActiveAdmin(admin)}
                    className={`w-full text-left px-4 py-3 border-b border-green-100 transition-colors ${activeAdmin?.email === admin.email ? "bg-green-100" : "hover:bg-green-50"}`}
                  >
                    <p className="text-xs font-bold text-[#244b30]">{admin.name}</p>
                    <p className="text-[10px] text-[#64806a] truncate">{admin.email}</p>
                  </button>
                ))}
              </div>

              <div className="flex-1 rounded-xl border border-green-200 bg-white shadow-sm flex flex-col overflow-hidden">
                {!activeAdmin ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#64806a]">Select an administrator to start chatting</div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-green-100">
                      <p className="text-xs font-extrabold text-[#244b30]">{activeAdmin.name}</p>
                      <p className="text-[10px] text-[#64806a]">{activeAdmin.email}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                      {adminChatMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-[#64806a]">No messages yet. Start the conversation!</div>
                      ) : adminChatMessages.map((message) => {
                        const isMine = message.sender_email.toLowerCase() === userEmail.toLowerCase();
                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${isMine ? "bg-[#315f40] text-white font-medium" : "bg-[#f1f8f2] border border-green-100 text-[#244b30]"}`}>
                              {!isMine && <p className="text-[10px] font-bold mb-0.5 text-[#64806a]">{message.sender_name}</p>}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <p className={`text-[9px] mt-0.5 ${isMine ? "text-white/70 text-right" : "text-[#78917e]"}`}>
                                {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={adminChatBottomRef} />
                    </div>
                    <form onSubmit={handleSendAdminChat} className="px-4 py-3 border-t border-green-100 flex gap-2">
                      <input
                        className="flex-1 border border-green-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-green-300 bg-[#f6fbf6] text-[#244b30] placeholder-[#78917e]"
                        placeholder="Type a message to the administrator..."
                        value={adminChatMsg}
                        onChange={(e) => setAdminChatMsg(e.target.value)}
                      />
                      <button type="submit" disabled={sendingAdminChat || !adminChatMsg.trim()} className="bg-[#315f40] text-white text-xs font-extrabold px-4 py-2 rounded-lg hover:bg-[#244b30] disabled:opacity-50 transition-colors">
                        {sendingAdminChat ? "Sending..." : "Send"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* -- Add Listing Modal -- */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-white">Add New Listing</h2>
              <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} aria-label="Close" className="text-white/50 hover:text-white/70"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 flex flex-col gap-3">
              {addError && <p className="text-lime-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>}
              <PropertyFields f={addForm} setF={setAddForm} newPreviews={addPreviews} onRemoveNew={removeAddImage} onAddImages={addImages} fileRef={addFileRef} />
              <div>
                <label className="text-xs font-semibold text-white">Location on Map (optional)</label>
                <div className="mt-1">
                  <MapPicker
                    lat={addLatLng.lat}
                    lng={addLatLng.lng}
                    onChange={(lat, lng) => setAddLatLng({ lat, lng })}
                    onAddress={(addr) => setAddForm((f) => ({ ...f, location: addr }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} className="flex-1 border border-white/20 text-white text-xs font-bold py-2 rounded-lg hover:bg-white/10">Cancel</button>
                <button type="submit" disabled={addSaving} className="flex-1 bg-white/20 text-white border border-white/20 text-xs font-bold py-2 rounded-lg hover:bg-white/30 disabled:opacity-60">{addSaving ? "Saving..." : "Add Listing"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -- Edit Listing Modal -- */}
      {editProp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-white">Edit Listing</h2>
              <button onClick={() => setEditProp(null)} aria-label="Close" className="text-white/50 hover:text-white/70"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-5 flex flex-col gap-3">
              {editError && <p className="text-lime-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</p>}
              <PropertyFields f={editForm} setF={setEditForm} existingImgs={editExisting} onRemoveExisting={(i) => setEditExisting((p) => p.filter((_, j) => j !== i))} newPreviews={editPreviews} onRemoveNew={removeEditNewImage} onAddImages={editImages} fileRef={editFileRef} />
              <div>
                <label className="text-xs font-semibold text-white">Location on Map (optional)</label>
                <div className="mt-1">
                  <MapPicker
                    lat={editLatLng.lat}
                    lng={editLatLng.lng}
                    onChange={(lat, lng) => setEditLatLng({ lat, lng })}
                    onAddress={(addr) => setEditForm((f) => ({ ...f, location: addr }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditProp(null)} className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-500 disabled:opacity-60">{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
