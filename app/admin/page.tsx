"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import Image from "next/image";
import dynamic from "next/dynamic";
import { CalendarDays, Check, CircleCheck, ClipboardCheck, Clock3, Download, FileText, Home, LogOut, Mail, Send, Star, TriangleAlert, Trophy, Users, X } from "lucide-react";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });
const emptyLatLng = { lat: null as number | null, lng: null as number | null };

// -- Types -------------------------------------------------
type Property = {
  id: string; title: string; location: string; price: string;
  status: string; description: string; images: string[];
  beds?: number; baths?: number; sqm?: number;
  landlord_email?: string; landlord_name?: string;
  latitude?: number | null; longitude?: number | null;
  amenities?: string[];
};
type User = { id: string; name: string; email: string; role: string; created_at: string; is_verified: boolean; is_banned?: boolean };
type Booking = {
  id: string; user_name: string; user_email: string;
  move_in_date: string; message: string; status: string; created_at: string;
  gov_id_url?: string | null; income_proof_url?: string | null;
  payment_receipt_url?: string | null; payment_confirmed?: boolean; moved_in?: boolean;
  properties: { title: string; location: string; price: string; images: string[] };
};
type Review = {
  id: string; property_id: string; user_email: string; user_name: string;
  rating: number; comment: string; created_at: string;
  properties?: { title: string };
};

const emptyForm = { title: "", location: "", price: "", status: "Available", description: "", beds: "", baths: "", sqm: "", landlord_email: "", landlord_name: "", amenities: "" };

const navItems = [
  { key: "dashboard",  label: "Dashboard",  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { key: "properties", label: "Properties", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
  { key: "users",      label: "Users",      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { key: "bookings",   label: "Bookings",   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { key: "reviews",    label: "Reviews",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
  { key: "analytics",  label: "Analytics",  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { key: "approvals",  label: "Approvals",  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: "announce",   label: "Announcements", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
  { key: "moveouts",   label: "Move-Outs",  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> },
  { key: "contacts",   label: "Messages",   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { key: "tenant-messages", label: "Tenant Messages", icon: <Mail className="w-4 h-4" /> },
  { key: "landlord-chat", label: "Landlord Chat", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
];

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

// -- Shared form fields -------------------------------------
function PropertyFields({
  f, setF, existingImgs, onRemoveExisting, newPreviews, onRemoveNew, onAddImages, fileRef, users,
}: {
  f: typeof emptyForm; setF: (v: typeof emptyForm) => void;
  existingImgs?: string[]; onRemoveExisting?: (i: number) => void;
  newPreviews: string[]; onRemoveNew: (i: number) => void;
  onAddImages: (files: FileList | null) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  users?: User[];
}) {
  return (
    <>
      {(["title", "price"] as const).map((field) => (
        <div key={field}>
          <label className="text-xs font-semibold text-white capitalize">{field} *</label>
          <input className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white placeholder-white/30" value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })} placeholder={field === "price" ? "e.g. ?25,000/mo" : ""} />
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
        <select className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option className="text-gray-900">Available</option><option className="text-gray-900">Booked</option><option className="text-gray-900">Maintenance</option>
        </select>
      </div>
      {/* Assign to landlord � only shown in admin context */}
      {users && (
        <div>
          <label className="text-xs font-semibold text-white">Assign to Landlord</label>
          <select
            className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white"
            value={f.landlord_email ?? ""}
            onChange={(e) => {
              const selected = users.find((u) => u.email === e.target.value);
              setF({ ...f, landlord_email: e.target.value, landlord_name: selected?.name ?? "" } as typeof emptyForm);
            }}
          >
            <option value="" className="text-gray-900">� Unassigned �</option>
            {users.filter((u) => u.role === "landlord").map((u) => (
              <option key={u.id} value={u.email} className="text-gray-900">{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {(["beds", "baths", "sqm"] as const).map((field) => (
          <div key={field}>
            <label className="text-xs font-semibold text-white capitalize">{field}</label>
            <input type="number" min="0" className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white" value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold text-white">Description</label>
        <textarea rows={3} className="w-full border border-white/20 rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-white/40 resize-none bg-white/10 text-white placeholder-white/30" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional description..." />
      </div>
      <div>
        <label className="text-xs font-semibold text-white mb-2 block">Amenities</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            "WiFi","Air Conditioning","Parking","Swimming Pool",
            "Security Guard","CCTV","Generator","Water 24/7",
            "Laundry Area","Kitchen","Furnished","Pet Friendly",
          ].map((a) => {
            const selected = f.amenities ? f.amenities.split(",").map(s => s.trim()).filter(Boolean).includes(a) : false;
            return (
              <label key={a} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${selected ? "bg-white/20 border-white/40 text-white font-semibold" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                <input
                  type="checkbox"
                  className="accent-white w-3 h-3"
                  checked={selected}
                  onChange={() => {
                    const arr = f.amenities ? f.amenities.split(",").map(s => s.trim()).filter(Boolean) : [];
                    const next = selected ? arr.filter(x => x !== a) : [...arr, a];
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
        <label className="text-xs font-semibold text-white">Images</label>
        {existingImgs && existingImgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 mt-1">
            {existingImgs.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/20 group">
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
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/20 group">
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

// -- Stars --------------------------------------------------
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <svg key={n} className={`w-3 h-3 ${n <= rating ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// -- Main ---------------------------------------------------
export default function AdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [userName, setUserName]   = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers]           = useState<User[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [reviews, setReviews]       = useState<Review[]>([]);

  // Add modal
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState(emptyForm);
  const [addFiles, setAddFiles]       = useState<File[]>([]);
  const [addPreviews, setAddPreviews] = useState<string[]>([]);
  const [addSaving, setAddSaving]     = useState(false);
  const [addLatLng, setAddLatLng]     = useState(emptyLatLng);
  const [addError, setAddError]       = useState("");
  const addFileRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editProp, setEditProp]         = useState<Property | null>(null);
  const [editForm, setEditForm]         = useState(emptyForm);
  const [editExisting, setEditExisting] = useState<string[]>([]);
  const [editFiles, setEditFiles]       = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);
  const [editSaving, setEditSaving]     = useState(false);
  const [editLatLng, setEditLatLng]     = useState(emptyLatLng);
  const [editError, setEditError]       = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [bookingFilter, setBookingFilter] = useState("All");
  const [userSearch, setUserSearch]       = useState("");
  const [reviewSearch, setReviewSearch]   = useState("");
  const [updatingRole, setUpdatingRole]   = useState<string | null>(null);
  const [updatingBan, setUpdatingBan]     = useState<string | null>(null);

  // Approvals (pending landlord-submitted properties)
  type PendingProp = Property & { submitted_by?: string };
  const [pendingProps, setPendingProps]   = useState<PendingProp[]>([]);

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

  type Announcement = { id: string; message: string; type: string; created_at: string; posted_by?: string };
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [announceMsg, setAnnounceMsg]         = useState("");
  const [announceType, setAnnounceType]       = useState("info");

  // Move-out requests
  type MoveOutRequest = {
    id: string; booking_id: string; tenant_email: string; tenant_name: string;
    property_id: string; move_out_date: string; reason?: string | null;
    status: "Pending" | "Acknowledged" | "Completed" | "Cancelled";
    acknowledged_by?: string | null; created_at: string;
    properties?: { title: string; landlord_email: string };
  };
  const [moveOuts, setMoveOuts]               = useState<MoveOutRequest[]>([]);
  const [moveOutFilter, setMoveOutFilter]     = useState("All");
  const [updatingMoveOut, setUpdatingMoveOut] = useState<string | null>(null);
  const [reminderMsg, setReminderMsg]         = useState<Record<string, string>>({});

  // Contact messages
  type ContactMessage = { id: string; name: string; email: string; subject?: string | null; message: string; is_read: boolean; created_at: string };
  const [contactMsgs, setContactMsgs]         = useState<ContactMessage[]>([]);
  const [contactFilter, setContactFilter]     = useState("All");
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [replyText, setReplyText]             = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply]       = useState<string | null>(null);

  // Tenant property conversations
  type TenantThread = { property_id: string; property_title: string; tenant_email: string; tenant_name: string; last_message: string; last_at: string };
  type TenantMessage = { id: string; sender_email: string; sender_name: string; content: string; created_at: string };
  const [tenantThreads, setTenantThreads] = useState<TenantThread[]>([]);
  const [activeTenantThread, setActiveTenantThread] = useState<TenantThread | null>(null);
  const [tenantThreadMessages, setTenantThreadMessages] = useState<TenantMessage[]>([]);
  const [tenantReply, setTenantReply] = useState("");
  const [sendingTenantReply, setSendingTenantReply] = useState(false);
  const tenantChatBottomRef = useRef<HTMLDivElement>(null);

  // Landlord direct chat
  type ChatThread = { thread_key: string; other_email: string; other_name: string; last_message: string; last_at: string; unread: number };
  type ChatMessage = { id: string; sender_email: string; sender_name: string; content: string; created_at: string };
  const [chatThreads, setChatThreads]         = useState<ChatThread[]>([]);
  const [activeChatThread, setActiveChatThread] = useState<ChatThread | null>(null);
  const [chatMessages, setChatMessages]       = useState<ChatMessage[]>([]);
  const [chatMsg, setChatMsg]                 = useState("");
  const [sendingChat, setSendingChat]         = useState(false);
  const chatUnread = chatThreads.reduce((total, thread) => total + thread.unread, 0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [postingAnnounce, setPostingAnnounce] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") { router.replace("/login"); return; }
    setUserName(s.name || s.email);
    setUserEmail(s.email);
    fetchAll();
  }, [router]);

  async function fetchAll() {
    const [propsRes, usersRes, booksRes] = await Promise.all([
      fetch("/api/properties?admin=1"), fetch("/api/users"), fetch("/api/bookings"),
    ]);
    const props = propsRes.ok ? await propsRes.json() : [];
    if (Array.isArray(props)) setProperties(props);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (booksRes.ok) setBookings(await booksRes.json());

    // Pending approvals: properties with status "Pending"
    if (Array.isArray(props)) setPendingProps(props.filter((p: Property) => p.status === "Pending"));

    // Announcements
    const annRes = await fetch("/api/announcements");
    if (annRes.ok) setAnnouncements(await annRes.json());

    // Move-out requests
    const moRes = await fetch("/api/move-out?email=admin&role=admin");
    if (moRes.ok) setMoveOuts(await moRes.json());

    // Contact messages
    const cmRes = await fetch("/api/contact?role=admin");
    if (cmRes.ok) setContactMsgs(await cmRes.json());

    if (Array.isArray(props)) {
      const allReviews: Review[] = [];
      await Promise.all(props.map(async (p: Property) => {
        const r = await fetch(`/api/reviews?property_id=${p.id}`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) data.forEach((rev) => allReviews.push({ ...rev, properties: { title: p.title } }));
        }
      }));
      allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReviews(allReviews);
    }
  }

  // -- Images helpers -------------------------------------
  function addImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setAddFiles((p) => [...p, ...arr]);
    setAddPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }
  function removeAddImage(i: number) { setAddFiles((p) => p.filter((_, j) => j !== i)); setAddPreviews((p) => p.filter((_, j) => j !== i)); }
  function editImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setEditFiles((p) => [...p, ...arr]);
    setEditPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }
  function removeEditNewImage(i: number) { setEditFiles((p) => p.filter((_, j) => j !== i)); setEditPreviews((p) => p.filter((_, j) => j !== i)); }

  // -- CRUD -----------------------------------------------
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.title || !addForm.price) { setAddError("Title and price are required."); return; }
    if (!addLatLng.lat || !addLatLng.lng) { setAddError("Please pin a location on the map."); return; }
    setAddSaving(true); setAddError("");
    const fd = new FormData();
    Object.entries(addForm).forEach(([k, v]) => { if (k !== "amenities") fd.append(k, v); });
    fd.append("amenities", JSON.stringify(addForm.amenities ? addForm.amenities.split(",").map(s => s.trim()).filter(Boolean) : []));
    fd.append("latitude", String(addLatLng.lat));
    fd.append("longitude", String(addLatLng.lng));
    addFiles.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/properties", { method: "POST", body: fd });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error); return; }
    setProperties((p) => [data, ...p]);
    setShowAdd(false); setAddForm(emptyForm); setAddLatLng(emptyLatLng); setAddFiles([]); setAddPreviews([]);
  }

  function openEdit(p: Property) {
    setEditProp(p);
    setEditForm({ title: p.title, location: p.location, price: p.price, status: p.status, description: p.description ?? "", beds: p.beds != null ? String(p.beds) : "", baths: p.baths != null ? String(p.baths) : "", sqm: p.sqm != null ? String(p.sqm) : "", landlord_email: p.landlord_email ?? "", landlord_name: p.landlord_name ?? "", amenities: Array.isArray(p.amenities) ? p.amenities.join(",") : "" });
    setEditLatLng({ lat: p.latitude ?? null, lng: p.longitude ?? null });
    setEditExisting(p.images ?? []); setEditFiles([]); setEditPreviews([]); setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProp || !editForm.title || !editForm.price) { setEditError("Title and price are required."); return; }
    setEditSaving(true); setEditError("");
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => { if (k !== "amenities") fd.append(k, v); });
    fd.append("amenities", JSON.stringify(editForm.amenities ? editForm.amenities.split(",").map(s => s.trim()).filter(Boolean) : []));
    // Only send lat/lng if they were set � otherwise keep existing values
    if (editLatLng.lat != null) fd.append("latitude", String(editLatLng.lat));
    if (editLatLng.lng != null) fd.append("longitude", String(editLatLng.lng));
    fd.append("existingImages", JSON.stringify(editExisting));
    editFiles.forEach((f) => fd.append("images", f));
    const res = await fetch(`/api/properties/${editProp.id}`, { method: "PATCH", body: fd });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error); return; }
    setProperties((p) => p.map((x) => x.id === editProp.id ? data : x));
    setEditProp(null); setEditLatLng(emptyLatLng);
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      body: (() => { const fd = new FormData(); fd.append("status", status); return fd; })(),
    });
    if (res.ok) {
      setProperties((p) => p.map((x) => x.id === id ? { ...x, status } : x));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property?")) return;
    const prop = properties.find((p) => p.id === id);
    const res = await fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { setProperties((p) => p.filter((x) => x.id !== id)); }
  }

  async function handleBookingStatus(id: string, status: string) {
    const res = await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, role: "admin" }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to update booking."); return; }
    setBookings((b) => b.map((x) => x.id === id ? { ...x, status } : x));
  }

  const [markingMovedIn, setMarkingMovedIn] = useState<string | null>(null);
  async function handleMarkMovedIn(id: string) {
    if (!confirm("Mark this tenant as moved in? They will be notified.")) return;
    setMarkingMovedIn(id);
    const res = await fetch("/api/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, landlord_email: userName, mark_moved_in: true, role: "admin" }),
    });
    setMarkingMovedIn(null);
    if (res.ok) setBookings((b) => b.map((x) => x.id === id ? { ...x, moved_in: true } : x));
    else { const d = await res.json(); alert(d.error ?? "Failed to mark move-in."); }
  }

  async function handleDeleteReview(id: string, user_email: string) {
    if (!confirm("Delete this review?")) return;
    await fetch("/api/reviews", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, user_email }) });
    setReviews((r) => r.filter((x) => x.id !== id));
  }

  async function writeAuditLog(action: string, target?: string, details?: string) {
    const s = getSession();
    if (!s) return;
    await fetch("/api/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_email: s.email, actor_role: s.role ?? "admin", action, target, details }),
    });
  }

  async function handleRoleChange(userId: string, role: string) {
    setUpdatingRole(userId);
    const user = users.find((u) => u.id === userId);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role }),
    });
    const data = await res.json();
    setUpdatingRole(null);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? data : u));
    }
  }

  async function handleBan(userId: string, is_banned: boolean) {
    setUpdatingBan(userId);
    const user = users.find((u) => u.id === userId);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, is_banned }),
    });
    const data = await res.json();
    setUpdatingBan(null);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? data : u));
    }
  }

  async function handleApproveProperty(id: string) {
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      body: (() => { const fd = new FormData(); fd.append("status", "Available"); return fd; })(),
    });
    if (res.ok) {
      setPendingProps((p) => p.filter((x) => x.id !== id));
      setProperties((p) => p.map((x) => x.id === id ? { ...x, status: "Available" } : x));
    }
  }

  async function handleRejectProperty(id: string) {
    if (!confirm("Reject and delete this property submission?")) return;
    const res = await fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) {
      setPendingProps((p) => p.filter((x) => x.id !== id));
      setProperties((p) => p.filter((x) => x.id !== id));
    }
  }

  function exportCSV(type: "bookings" | "users") {
    if (type === "bookings") {
      const rows = [["ID","Tenant","Email","Property","Move-in","Status","Submitted"],
        ...bookings.map((b) => [b.id, b.user_name, b.user_email, b.properties?.title ?? "", b.move_in_date, b.status, b.created_at])];
      downloadCSV(rows, "bookings.csv");
    } else {
      const rows = [["ID","Name","Email","Role","Verified","Joined"],
        ...users.map((u) => [u.id, u.name, u.email, u.role, u.is_verified ? "Yes" : "No", u.created_at])];
      downloadCSV(rows, "users.csv");
    }
  }

  function downloadCSV(rows: (string | boolean | undefined)[][], filename: string) {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  async function handlePostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!announceMsg.trim()) return;
    setPostingAnnounce(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: announceMsg, type: announceType, posted_by: userName }),
    });
    const data = await res.json();
    setPostingAnnounce(false);
    if (!res.ok) { alert(data.error ?? "Failed to post announcement."); return; }
    setAnnouncements((prev) => [data, ...prev]);
    setAnnounceMsg("");
  }

  async function handleDeleteAnnouncement(id: string) {
    await fetch("/api/announcements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSendReply(msgId: string) {
    const reply = replyText[msgId]?.trim();
    const contact = contactMsgs.find((m) => m.id === msgId);
    if (!reply || !contact || !userEmail) return;
    setSendingReply(msgId);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_email: userEmail, sender_name: userName, receiver_email: contact.email, content: reply }),
    });
    const data = await res.json();
    setSendingReply(null);
    if (!res.ok) { alert(data.error ?? "Failed to send reply."); return; }
    await fetch("/api/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msgId, role: "admin" }),
    });
    setReplyText((r) => { const c = { ...r }; delete c[msgId]; return c; });
    setContactMsgs((prev) => prev.map((m) => m.id === msgId ? { ...m, is_read: true } : m));
    alert("Reply sent in HOMERent Messages.");
  }

  async function loadTenantThreads(email: string) {
    const res = await fetch(`/api/admin/tenant-messages?admin_email=${encodeURIComponent(email)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTenantThreads(Array.isArray(data) ? data : []);
    }
  }

  async function openTenantThread(thread: TenantThread) {
    setActiveTenantThread(thread);
    setTenantReply("");
    const params = new URLSearchParams({ admin_email: userEmail, property_id: thread.property_id, tenant_email: thread.tenant_email });
    const res = await fetch(`/api/admin/tenant-messages?${params}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to load this tenant conversation."); return; }
    setTenantThreadMessages(Array.isArray(data) ? data : []);
    setTimeout(() => tenantChatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSendTenantReply(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantReply.trim() || !activeTenantThread || !userEmail) return;
    setSendingTenantReply(true);
    const res = await fetch("/api/admin/tenant-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_email: userEmail, property_id: activeTenantThread.property_id, tenant_email: activeTenantThread.tenant_email, content: tenantReply.trim() }),
    });
    const data = await res.json();
    setSendingTenantReply(false);
    if (!res.ok) { alert(data.error ?? "Unable to send your reply."); return; }
    setTenantThreadMessages((previous) => [...previous, data]);
    setTenantReply("");
    setTenantThreads((previous) => previous.map((thread) =>
      thread.property_id === activeTenantThread.property_id && thread.tenant_email === activeTenantThread.tenant_email
        ? { ...thread, last_message: data.content, last_at: data.created_at }
        : thread
    ));
    setTimeout(() => tenantChatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // ── Landlord chat handlers ────────────────────────────────
  async function loadChatThreads(email: string) {
    const res = await fetch(`/api/admin/messages?email=${encodeURIComponent(email)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setChatThreads(Array.isArray(data) ? data : []);
    }
  }

  async function openChatThread(thread: ChatThread) {
    setActiveChatThread({ ...thread, unread: 0 });
    if (!thread || !userEmail) return;
    setChatThreads((prev) => prev.map((t) => t.thread_key === thread.thread_key ? { ...t, unread: 0 } : t));
    const res = await fetch(`/api/admin/messages?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(thread.other_email)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setChatMessages(Array.isArray(data) ? data : []);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      await loadChatThreads(userEmail);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Unable to mark this conversation as read.");
      await loadChatThreads(userEmail);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMsg.trim() || !activeChatThread || !userEmail) return;
    setSendingChat(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_email: userEmail, sender_name: userName, receiver_email: activeChatThread.other_email, content: chatMsg.trim() }),
    });
    setSendingChat(false);
    if (res.ok) {
      const data = await res.json();
      setChatMessages((prev) => [...prev, data]);
      setChatMsg("");
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  useEffect(() => { if (userEmail) loadChatThreads(userEmail); }, [userEmail]); // eslint-disable-line
  useEffect(() => { if (userEmail) loadTenantThreads(userEmail); }, [userEmail]); // eslint-disable-line

  async function handleMoveOutAction(id: string, status: "Acknowledged" | "Completed", reminder?: string) {
    setUpdatingMoveOut(id);
    const res = await fetch("/api/move-out", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id, status,
        actor_email: userName,
        role: "admin",
        reminder_message: reminder?.trim() || undefined,
      }),
    });
    setUpdatingMoveOut(null);
    if (res.ok) {
      if (reminder) {
        setReminderMsg((r) => ({ ...r, [id]: "" }));
      } else {
        const data = await res.json();
        setMoveOuts((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m));
      }
    } else {
      const d = await res.json();
      alert(d.error ?? "Failed to update move-out request.");
    }
  }

  async function handleSendReminder(id: string) {
    const msg = reminderMsg[id]?.trim();
    if (!msg) return;
    setUpdatingMoveOut(id);
    const res = await fetch("/api/move-out", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actor_email: userName, role: "admin", reminder_message: msg }),
    });
    setUpdatingMoveOut(null);
    if (res.ok) { setReminderMsg((r) => ({ ...r, [id]: "" })); alert("Reminder sent to tenant."); }
    else { const d = await res.json(); alert(d.error ?? "Failed to send reminder."); }
  }

  // -- Derived ---------------------------------------------
  const pendingBookings   = bookings.filter((b) => b.status === "Pending").length;
  const unreadContacts    = contactMsgs.filter((m) => !m.is_read).length;
  const approvedBookings  = bookings.filter((b) => b.status === "Approved").length;
  const filteredBookings  = bookingFilter === "All" ? bookings : bookings.filter((b) => b.status === bookingFilter);
  const filteredUsers     = users.filter((u) => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredReviews   = reviews.filter((r) => r.user_name?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.properties?.title?.toLowerCase().includes(reviewSearch.toLowerCase()));
  const avgRating         = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "�";
  const pendingApprovals  = pendingProps.length;

  // Analytics
  const approvedBookingsList = bookings.filter((b) => b.status === "Approved");
  const totalRevenue = approvedBookingsList.reduce((sum, b) => {
    const n = Number((b.properties?.price ?? "").replace(/[^0-9]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const bookingsByProperty = bookings.reduce((acc: Record<string, { title: string; count: number }>, b) => {
    const id = (b as unknown as { property_id?: string }).property_id ?? b.properties?.title ?? "unknown";
    if (!acc[id]) acc[id] = { title: b.properties?.title ?? "Unknown", count: 0 };
    acc[id].count++;
    return acc;
  }, {});
  const topProperties = Object.values(bookingsByProperty).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className={`flex min-h-screen ${activeNav === "dashboard" || activeNav === "bookings" || activeNav === "properties" || activeNav === "users" || activeNav === "announce" || activeNav === "moveouts" ? "bg-[#edf7ee]" : "bg-[#387a4b]"}`}>

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
                <button onClick={closeDocModal} aria-label="Close" className="text-white/60 hover:text-white/90"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {docLoading && (
                <div className="flex flex-col items-center gap-2 text-white/60">
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
      <aside className="w-56 bg-[#e3f2e5] text-[#244b30] flex flex-col shrink-0 border-r border-green-200">
        <div className="px-5 py-5 border-b border-green-200">
          <span className="text-lg font-extrabold">HOME<span className="text-lime-500">R</span><span className="text-lime-500 italic">ent</span></span>
          <p className="text-[10px] text-[#64806a] mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => { setActiveNav(item.key); if (item.key === "landlord-chat" && userEmail) loadChatThreads(userEmail); if (item.key === "tenant-messages" && userEmail) loadTenantThreads(userEmail); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeNav === item.key ? "bg-green-200 text-[#244b30]" : "text-[#54745b] hover:bg-green-100 hover:text-[#244b30]"}`}>
              {item.icon}{item.label}
              {item.key === "bookings" && pendingBookings > 0 && (
                <span className="ml-auto bg-lime-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingBookings}</span>
              )}
              {item.key === "contacts" && unreadContacts > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadContacts}</span>
              )}
              {item.key === "landlord-chat" && chatUnread > 0 && (
                <span className="ml-auto bg-lime-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chatUnread}</span>
              )}
              {item.key === "approvals" && pendingApprovals > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingApprovals}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-green-200">
          <div className="flex items-center gap-2 px-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-[#315f40] text-xs font-bold">{userName.charAt(0).toUpperCase()}</div>
            <span className="text-xs text-[#64806a] truncate">{userName}</span>
          </div>
          <button onClick={() => { clearSession(); router.push("/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#54745b] hover:bg-green-100 hover:text-[#244b30] transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* -- Main -- */}
      <main className="flex-1 overflow-auto">
        <div className={`backdrop-blur-sm border-b px-6 py-4 flex items-center justify-between ${activeNav === "dashboard" || activeNav === "bookings" || activeNav === "properties" || activeNav === "users" || activeNav === "announce" || activeNav === "moveouts" || activeNav === "landlord-chat" ? "bg-white/90 border-green-100" : "bg-white/10 border-white/10"}`}>
          <h1 className={`text-lg font-extrabold capitalize ${activeNav === "dashboard" || activeNav === "bookings" || activeNav === "properties" || activeNav === "users" || activeNav === "announce" || activeNav === "moveouts" || activeNav === "landlord-chat" ? "text-[#244b30]" : "text-white"}`}>{activeNav === "tenant-messages" ? "Tenant Messages" : activeNav}</h1>
          <span className={`text-sm ${activeNav === "dashboard" || activeNav === "bookings" || activeNav === "properties" || activeNav === "users" || activeNav === "announce" || activeNav === "moveouts" || activeNav === "landlord-chat" ? "text-[#5b8064]" : "text-white/70"}`}>Welcome, <span className={`font-semibold capitalize ${activeNav === "dashboard" || activeNav === "bookings" || activeNav === "properties" || activeNav === "users" || activeNav === "announce" || activeNav === "moveouts" || activeNav === "landlord-chat" ? "text-[#244b30]" : "text-white"}`}>{userName}</span></span>
        </div>

        <div className="p-6">

          {/* -- Dashboard -- */}
          {activeNav === "dashboard" && (
            <div className="flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Properties", value: properties.length,  icon: <Home />, color: "bg-blue-50 text-blue-600" },
                  { label: "Total Users",       value: users.length,       icon: <Users />, color: "bg-green-50 text-green-600" },
                  { label: "Total Bookings",    value: bookings.length,    icon: <CalendarDays />, color: "bg-yellow-50 text-yellow-600" },
                  { label: "Pending Bookings",  value: pendingBookings,    icon: <Clock3 />, color: "bg-lime-50 text-lime-700" },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 [&>svg]:w-5 [&>svg]:h-5 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-[#244b30]">{s.value}</p>
                    <p className="text-xs text-[#64806a] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Available Props",   value: properties.filter((p) => p.status === "Available").length,  icon: <CircleCheck />, color: "bg-green-50 text-green-600" },
                  { label: "Approved Bookings", value: approvedBookings, icon: <ClipboardCheck />, color: "bg-blue-50 text-blue-600" },
                  { label: "Total Reviews",     value: reviews.length,  icon: <Star />, color: "bg-yellow-50 text-yellow-600" },
                  { label: "Avg Rating",        value: avgRating,       icon: <Trophy />, color: "bg-purple-50 text-purple-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 [&>svg]:w-5 [&>svg]:h-5 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-[#244b30]">{s.value}</p>
                    <p className="text-xs text-[#64806a] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Booking status breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-[#244b30] mb-4">Booking Breakdown</h2>
                  {[
                    { label: "Pending",   count: bookings.filter((b) => b.status === "Pending").length,   color: "bg-yellow-400" },
                    { label: "Approved",  count: bookings.filter((b) => b.status === "Approved").length,  color: "bg-green-500" },
                    { label: "Rejected",  count: bookings.filter((b) => b.status === "Rejected").length,  color: "bg-lime-500" },
                    { label: "Cancelled", count: bookings.filter((b) => b.status === "Cancelled").length, color: "bg-gray-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                      <span className="text-xs text-[#45654d] flex-1">{s.label}</span>
                      <span className="text-xs font-bold text-[#244b30]">{s.count}</span>
                      <div className="w-24 h-1.5 bg-green-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full`} style={{ width: bookings.length ? `${(s.count / bookings.length) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-[#244b30] mb-4">Recent Registrations</h2>
                  {users.slice(0, 5).map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-3 py-2 px-2 rounded-lg border-b border-green-50 last:border-0 ${i % 2 === 0 ? "bg-green-50/70" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-[#315f40] text-xs font-bold shrink-0">{u.name?.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#244b30] truncate">{u.name}</p>
                        <p className="text-[10px] text-[#64806a] truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] text-[#64806a]">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-xs text-[#64806a] text-center py-4">No users yet.</p>}
                </div>
              </div>

              {/* Recent reviews */}
              <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-[#244b30] mb-4">Recent Reviews</h2>
                {reviews.slice(0, 4).length === 0 ? <p className="text-xs text-[#64806a] text-center py-4">No reviews yet.</p> : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {reviews.slice(0, 4).map((r) => (
                      <div key={r.id} className="border border-green-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-[#244b30]">{r.user_name}</p>
                          <Stars rating={r.rating} />
                        </div>
                        <p className="text-[10px] text-[#64806a] mb-1">{r.properties?.title}</p>
                        {r.comment && <p className="text-xs text-[#45654d] line-clamp-2">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -- Properties -- */}
          {activeNav === "properties" && (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#244b30]">All Properties</h2>
                  <p className="text-xs text-[#64806a] mt-0.5">{properties.length} listing{properties.length !== 1 ? "s" : ""} total</p>
                </div>
                <button onClick={() => { setShowAdd(true); setAddError(""); }} className="flex items-center gap-2 bg-[#315f40] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#244b30] border border-[#315f40] transition-colors">
                  <span className="text-base leading-none">+</span> Add Property
                </button>
              </div>

              {/* Cards grid */}
              {properties.length === 0 ? (
                <div className="bg-white border border-green-200 rounded-xl p-12 text-center text-[#64806a]">
                  <Home className="h-8 w-8 mx-auto mb-3 text-[#64806a]" />
                  <p className="text-sm font-semibold">No properties yet</p>
                  <p className="text-xs mt-1">Click + Add Property to create the first listing.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {properties.map((p) => (
                    <div key={p.id} className="bg-white border border-green-200 rounded-xl overflow-hidden hover:shadow-md hover:border-green-300 transition-all group">
                      {/* Image */}
                      <div className="relative h-36 bg-green-50">
                        {p.images?.[0] ? (
                          <Image src={p.images[0]} alt={p.title} fill sizes="300px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#64806a] text-xs">No image</div>
                        )}
                        {/* Status badge */}
                        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {p.status}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="text-sm font-extrabold text-[#244b30] truncate mb-0.5">{p.title}</h3>
                        <div className="flex items-center gap-1 text-[#64806a] mb-2">
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-[10px] text-[#64806a] truncate">{p.location}</span>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-extrabold text-[#244b30]">{p.price}</span>
                          {(p.beds != null || p.baths != null) && (
                            <span className="text-[10px] text-[#64806a]">
                              {p.beds != null && `${p.beds} beds`}
                              {p.beds != null && p.baths != null && " / "}
                              {p.baths != null && `${p.baths} baths`}
                            </span>
                          )}
                        </div>

                        {/* Landlord */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-[#315f40] shrink-0">
                            {(p.landlord_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-[#64806a] truncate">{p.landlord_name || "Unassigned"}</span>
                        </div>
                        {/* No location warning */}
                        {!p.latitude && (
                          <p className="text-[10px] text-amber-700 font-semibold mb-2">No map location. Add one in Edit.</p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {/* Status changer */}
                          <select
                            value={p.status}
                            onChange={(e) => handleStatusChange(p.id, e.target.value)}
                            className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border border-green-200 bg-[#f6fbf6] text-[#244b30] outline-none focus:ring-1 focus:ring-green-300 cursor-pointer"
                          >
                            <option value="Available" className="text-gray-900">Available</option>
                            <option value="Booked" className="text-gray-900">Booked</option>
                            <option value="Maintenance" className="text-gray-900">Maintenance</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-green-200 text-[#315f40] hover:bg-green-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Users -- */}
          {activeNav === "users" && (
            <div className="bg-white border border-green-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-[#244b30]">All Users ({users.length})</h2>
                <div className="flex gap-2">
                  <input className="bg-[#f6fbf6] border border-green-200 rounded-lg px-3 py-1.5 text-xs text-[#244b30] placeholder-[#64806a] outline-none focus:ring-1 focus:ring-green-300 w-48" placeholder="Search name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  <button onClick={() => exportCSV("users")} className="flex items-center gap-1.5 bg-white border border-green-200 text-[#315f40] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-50"><Download className="h-3.5 w-3.5" /> Export CSV</button>
                </div>
              </div>
              <p className="text-xs text-[#64806a] mb-4">Change a user&apos;s role to <strong className="text-[#315f40]">landlord</strong> to grant them access to the Landlord Dashboard.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-green-50 text-[#456b4e] border-b border-green-200">
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40] rounded-l-lg">User</th>
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40]">Email</th>
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40]">Role</th>
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40]">Verified</th>
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40]">Joined</th>
                    <th className="text-left py-2.5 px-2 font-bold text-[#315f40] rounded-r-lg">Ban</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className={`border-b border-green-100 last:border-0 ${i % 2 === 0 ? "bg-[#f6fbf6]" : "bg-white"}`}>
                        <td className="py-2.5 px-2 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${u.role === "admin" ? "bg-green-700 text-white" : u.role === "landlord" ? "bg-emerald-600 text-white" : "bg-[#dcefe0] text-[#315f40]"}`}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-[#244b30]">{u.name}</span>
                        </td>
                        <td className="py-2.5 px-2 text-[#456b4e]">{u.email}</td>
                        <td className="py-2.5 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === "landlord" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : u.role === "admin"  ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-white text-[#54745b] border-green-200"
                          }`}>{u.role}</span>
                        </td>
                        <td className="py-2.5 px-2">{u.is_verified ? <span className="inline-flex rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Verified</span> : <span className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Not verified</span>}</td>
                        <td className="py-2.5 px-2 text-[#456b4e]">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="py-2.5 px-2">
                          {u.email !== "admin@homerent.ph" && (
                            <button
                              disabled={updatingBan === u.id}
                              onClick={() => handleBan(u.id, !u.is_banned)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg disabled:opacity-60 border transition-colors ${
                                u.is_banned
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {updatingBan === u.id ? "..." : u.is_banned ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#64806a]">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -- Bookings -- */}
          {activeNav === "bookings" && (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#244b30]">All Bookings</h2>
                  <p className="text-xs text-[#64806a] mt-0.5">{bookings.length} total - {bookings.filter((b) => b.status === "Pending").length} pending review</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["All","Pending","Approved","Rejected","Cancelled"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setBookingFilter(f)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        bookingFilter === f
                          ? "bg-[#315f40] text-white border-[#315f40]"
                          : "bg-white text-[#456b4e] border-green-200 hover:bg-green-50"
                      }`}
                    >
                      {f}
                      {f !== "All" && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${bookingFilter === f ? "bg-white/20 text-white" : "bg-green-100 text-[#54745b]"}`}>
                          {bookings.filter((b) => b.status === f).length}
                        </span>
                      )}
                    </button>
                  ))}
                  <button onClick={() => exportCSV("bookings")} className="flex items-center gap-1.5 bg-white border border-green-200 text-[#315f40] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-50">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Cards */}
              {filteredBookings.length === 0 ? (
                <div className="bg-white border border-green-200 rounded-xl p-12 text-center text-[#64806a]">
                  <CalendarDays className="h-8 w-8 mx-auto mb-3 text-[#64806a]" />
                  <p className="text-sm font-semibold">No {bookingFilter !== "All" ? bookingFilter.toLowerCase() + " " : ""}bookings</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className={`bg-white border border-green-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm ${b.status === "Pending" ? "border-amber-300" : ""}`}>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          {/* Tenant avatar */}
                          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-[#315f40] text-sm font-extrabold shrink-0">
                            {b.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-[#244b30]">{b.user_name}</p>
                            <p className="text-[10px] text-[#64806a]">{b.user_email}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${bookingStatusColor[b.status] ?? "bg-gray-100 text-white/90"}`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Property + dates */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f6fbf6] border border-green-100 rounded-lg p-3">
                        <div>
                          <p className="text-[10px] font-semibold text-[#64806a] uppercase tracking-wide mb-0.5">Property</p>
                          <p className="text-xs font-bold text-[#244b30] leading-snug">{b.properties?.title ?? "Property unavailable"}</p>
                          <p className="text-[10px] text-[#64806a] truncate">{b.properties?.location}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#64806a] uppercase tracking-wide mb-0.5">Move-in</p>
                          <p className="text-xs font-bold text-[#244b30]">{new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#64806a] uppercase tracking-wide mb-0.5">Submitted</p>
                          <p className="text-xs font-bold text-[#244b30]">{new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#64806a] uppercase tracking-wide mb-0.5">Rent</p>
                          <p className="text-xs font-bold text-[#244b30]">{b.properties?.price ?? "Not available"}</p>
                        </div>
                      </div>

                      {/* Bottom row: documents + actions */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Document badges */}
                        <div className="flex gap-2">
                          {b.gov_id_url ? (
                            <button
                              onClick={() => openDocModal(`Gov ID � ${b.user_name}`, b.gov_id_url!)}
                              className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-sky-100 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                              Gov ID
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                              No Gov ID
                            </span>
                          )}
                          {b.income_proof_url ? (
                            <button
                              onClick={() => openDocModal(`Income Proof � ${b.user_name}`, b.income_proof_url!)}
                              className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Income Proof
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              No Income Proof
                            </span>
                          )}
                          {b.payment_receipt_url ? (
                            <button
                              onClick={() => openDocModal(`Receipt � ${b.user_name}`, b.payment_receipt_url!)}
                              className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                              {b.payment_confirmed ? "Receipt confirmed" : "Receipt"}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                              No Receipt
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        {b.status === "Pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleBookingStatus(b.id, "Approved")}
                              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleBookingStatus(b.id, "Rejected")}
                              className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        )}
                        {b.status === "Approved" && (
                          <div className="flex items-center gap-2 mt-1">
                            {b.moved_in ? (
                              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800">Moved In</span>
                            ) : (
                              <button
                                onClick={() => handleMarkMovedIn(b.id)}
                                disabled={markingMovedIn === b.id}
                                className="text-xs font-bold px-4 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white disabled:opacity-60 transition-colors"
                              >
                                {markingMovedIn === b.id ? "..." : "Mark Moved In"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Reviews -- */}
          {activeNav === "reviews" && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-white">All Reviews ({reviews.length})</h2>
                <input className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-300 w-48" placeholder="Search reviewer or property..." value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} />
              </div>
              {reviews.length > 0 && (
                <p className="text-xs text-white/60 mb-4">Average rating: <span className="font-bold text-white">{avgRating} / 5</span></p>
              )}
              <div className="flex flex-col divide-y">
                {filteredReviews.length === 0 ? (
                  <p className="text-xs text-white/60 text-center py-8">No reviews found.</p>
                ) : filteredReviews.map((r) => (
                  <div key={r.id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{r.user_name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="text-xs font-bold text-white">{r.user_name}</p>
                          <p className="text-[10px] text-white/60">{r.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Stars rating={r.rating} />
                          <p className="text-[10px] text-white/60 mt-0.5">{r.properties?.title}</p>
                        </div>
                        <div className="text-[10px] text-white/60">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <button onClick={() => handleDeleteReview(r.id, r.user_email)} className="text-lime-400 hover:underline text-[10px] font-semibold">Delete</button>
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-white/90 mt-2 ml-10 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Analytics -- */}
          {activeNav === "analytics" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Bookings",    value: bookings.length,                           icon: <CalendarDays />, color: "bg-yellow-50 text-yellow-600" },
                  { label: "Approved Bookings", value: approvedBookings,                          icon: <ClipboardCheck />, color: "bg-blue-50 text-blue-600" },
                  { label: "Est. Revenue",       value: `₱${totalRevenue.toLocaleString()}`,      icon: "💰", color: "bg-yellow-500/20 text-yellow-300" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-white">{s.value}</p>
                    <p className="text-xs text-white/70 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-white mb-4">Most Booked Properties</h2>
                {topProperties.length === 0 ? (
                  <p className="text-xs text-white/60 text-center py-6">No booking data yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {topProperties.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-white/60 w-5">#{i + 1}</span>
                        <span className="flex-1 text-xs font-semibold text-white truncate">{p.title}</span>
                        <span className="text-xs font-bold text-white">{p.count} booking{p.count !== 1 ? "s" : ""}</span>
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.count / (topProperties[0]?.count || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-white mb-4">Booking Status Breakdown</h2>
                {["Pending","Approved","Rejected","Cancelled"].map((s) => {
                  const count = bookings.filter((b) => b.status === s).length;
                  const colors: Record<string,string> = { Pending:"bg-yellow-400", Approved:"bg-green-500", Rejected:"bg-lime-500", Cancelled:"bg-gray-400" };
                  return (
                    <div key={s} className="flex items-center gap-3 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${colors[s]} shrink-0`} />
                      <span className="text-xs text-white/90 flex-1">{s}</span>
                      <span className="text-xs font-bold text-white">{count}</span>
                      <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[s]} rounded-full`} style={{ width: bookings.length ? `${(count/bookings.length)*100}%` : "0%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}




          {/* -- Approvals -- */}
          {activeNav === "approvals" && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5">
              <h2 className="text-sm font-extrabold text-white mb-4">Pending Property Approvals ({pendingApprovals})</h2>
              {pendingProps.length === 0 ? (
                <p className="text-xs text-white/60 text-center py-8">No pending submissions.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingProps.map((p) => (
                    <div key={p.id} className="border rounded-xl overflow-hidden flex flex-col sm:flex-row">
                      <div className="relative w-full sm:w-32 h-28 shrink-0 bg-white/10">
                        {p.images?.[0] ? <Image src={p.images[0]} alt={p.title} fill sizes="128px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">No img</div>}
                      </div>
                      <div className="flex-1 p-4">
                        <p className="text-xs font-extrabold text-white">{p.title}</p>
                        <p className="text-[10px] text-white/60 mb-1">{p.location} &bull; {p.price}</p>
                        <p className="text-[10px] text-white/70 mb-3">Submitted by: {p.landlord_name || p.landlord_email || "�"}</p>
                        <div className="flex gap-2">
                  <button onClick={() => handleApproveProperty(p.id)} className="inline-flex items-center gap-1.5 bg-green-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-green-800"><Check className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={() => handleRejectProperty(p.id)} className="inline-flex items-center gap-1.5 bg-rose-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-rose-800"><X className="h-3.5 w-3.5" /> Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Move-Outs -- */}
          {activeNav === "moveouts" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-extrabold text-[#244b30]">Move-Out Requests</h2>
                <div className="flex gap-1 flex-wrap">
                  {["All", "Pending", "Acknowledged", "Completed", "Cancelled"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setMoveOutFilter(f)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${moveOutFilter === f ? "bg-[#315f40] text-white border-[#315f40]" : "bg-white border-green-200 text-[#54745b] hover:bg-green-50"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {moveOuts.filter((m) => moveOutFilter === "All" || m.status === moveOutFilter).length === 0 ? (
                <div className="bg-white border border-green-200 rounded-xl p-10 text-center">
                  <CalendarDays className="h-7 w-7 mx-auto mb-2 text-[#64806a]" />
                  <p className="text-sm font-semibold text-[#244b30]">No move-out requests</p>
                  <p className="text-xs text-[#64806a] mt-1">Tenant move-out requests will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {moveOuts
                    .filter((m) => moveOutFilter === "All" || m.status === moveOutFilter)
                    .map((m) => {
                      const isWithin7Days = (() => {
                        const diff = (new Date(m.move_out_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                        return diff >= 0 && diff <= 7;
                      })();
                      const statusStyle: Record<string, string> = {
                        Pending:      "bg-amber-100 border-amber-300 text-amber-900",
                        Acknowledged: "bg-sky-100 border-sky-300 text-sky-900",
                        Completed:    "bg-emerald-100 border-emerald-300 text-emerald-900",
                        Cancelled:    "bg-gray-100 border-gray-200 text-gray-700",
                      };
                      return (
                        <div key={m.id} className={`bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm ${isWithin7Days && m.status !== "Completed" && m.status !== "Cancelled" ? "border-orange-300" : "border-green-200"}`}>
                          {/* Urgent badge */}
                          {isWithin7Days && m.status !== "Completed" && m.status !== "Cancelled" && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                              <TriangleAlert className="h-4 w-4 text-amber-700" />
                              <p className="text-[10px] font-bold text-amber-800">Move-out within 7 days!</p>
                            </div>
                          )}

                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-sm font-extrabold text-[#244b30]">{m.tenant_name}</p>
                              <p className="text-[10px] text-[#64806a]">{m.tenant_email}</p>
                              <p className="text-xs text-[#456b4e] mt-0.5">
                                {(m.properties as { title?: string } | null)?.title ?? "�"}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusStyle[m.status]}`}>
                              {m.status}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold">Move-Out Date</p>
                              <p className="text-[#315f40] mt-0.5 font-semibold">
                                {new Date(m.move_out_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold">Submitted</p>
                              <p className="text-[#315f40] mt-0.5">
                                {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>

                          {m.reason && (
                            <div className="bg-[#f6fbf6] rounded-lg px-3 py-2 border border-green-100">
                              <p className="text-[10px] text-[#64806a] uppercase tracking-wide font-semibold mb-0.5">Reason</p>
                              <p className="text-xs text-[#315f40]">{m.reason}</p>
                            </div>
                          )}

                          {/* Actions */}
                          {(m.status === "Pending" || m.status === "Acknowledged") && (
                            <div className="flex flex-col gap-2 pt-1 border-t border-green-100">
                              {/* Reminder */}
                              <div className="flex gap-2">
                                <input
                                  className="flex-1 bg-[#f6fbf6] border border-green-200 rounded-lg px-3 py-1.5 text-xs text-[#244b30] placeholder-[#78917e] outline-none focus:ring-1 focus:ring-green-300"
                                  placeholder="Send a reminder to tenant (optional)"
                                  value={reminderMsg[m.id] ?? ""}
                                  onChange={(e) => setReminderMsg((r) => ({ ...r, [m.id]: e.target.value }))}
                                />
                                <button
                                  onClick={() => handleSendReminder(m.id)}
                                  disabled={!reminderMsg[m.id]?.trim() || updatingMoveOut === m.id}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#315f40] border border-[#315f40] text-white hover:bg-[#244b30] disabled:opacity-40 transition-colors"
                                >
                                  <Send className="h-3.5 w-3.5" /> Send
                                </button>
                              </div>
                              {/* Status buttons */}
                              <div className="flex gap-2 flex-wrap">
                                {m.status === "Pending" && (
                                  <button
                                    onClick={() => handleMoveOutAction(m.id, "Acknowledged")}
                                    disabled={updatingMoveOut === m.id}
                                    className="text-xs font-bold px-4 py-1.5 rounded-lg bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-60 transition-colors"
                                  >
                                    {updatingMoveOut === m.id ? "..." : "Acknowledge"}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleMoveOutAction(m.id, "Completed")}
                                  disabled={updatingMoveOut === m.id}
                                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
                                >
                                  {updatingMoveOut === m.id ? "..." : <><Check className="h-3.5 w-3.5 inline" /> Mark Completed</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {m.status === "Completed" && m.acknowledged_by && (
                            <p className="text-[10px] text-[#64806a] italic">Completed by {m.acknowledged_by}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* -- Contact Messages -- */}
          {activeNav === "contacts" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-extrabold text-white">Contact Messages</h2>
                <div className="flex gap-1">
                  {["All", "Unread", "Read"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setContactFilter(f)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${contactFilter === f ? "bg-white text-[#387a4b] border-white" : "border-white/20 text-white/60 hover:bg-white/10"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {contactMsgs.filter((m) =>
                contactFilter === "All" ? true :
                contactFilter === "Unread" ? !m.is_read : m.is_read
              ).length === 0 ? (
                <div className="bg-white/10 border border-white/20 rounded-xl p-10 text-center">
                  <Mail className="h-7 w-7 mx-auto mb-2 text-white/60" />
                  <p className="text-sm font-semibold text-white">No messages yet</p>
                  <p className="text-xs text-white/50 mt-1">Contact form submissions will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {contactMsgs
                    .filter((m) =>
                      contactFilter === "All" ? true :
                      contactFilter === "Unread" ? !m.is_read : m.is_read
                    )
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-4 flex flex-col gap-2 cursor-pointer transition-colors ${!m.is_read ? "bg-blue-500/10 border-blue-400/30" : "bg-white/10 border-white/20"}`}
                        onClick={async () => {
                          setExpandedContact(expandedContact === m.id ? null : m.id);
                          if (!m.is_read) {
                            await fetch("/api/contact", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, role: "admin" }) });
                            setContactMsgs((prev) => prev.map((x) => x.id === m.id ? { ...x, is_read: true } : x));
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            {!m.is_read && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                            <div>
                              <p className="text-sm font-extrabold text-white">{m.name}</p>
                              <p className="text-[10px] text-white/50">{m.email}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/40">
                            {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {m.subject && <p className="text-xs font-semibold text-white/80"><FileText className="h-3.5 w-3.5 inline mr-1" />{m.subject}</p>}
                        {expandedContact === m.id ? (
                          <p className="text-xs text-white/70 leading-relaxed bg-white/5 rounded-lg px-3 py-2 border border-white/10">{m.message}</p>
                        ) : (
                          <p className="text-xs text-white/60 truncate">{m.message}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedContact(m.id); }}
                            className="text-[10px] font-bold px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                          >
                            Reply in System
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.is_read ? "bg-white/10 text-white/40" : "bg-blue-500/20 text-blue-200"}`}>
                            {m.is_read ? "Read" : "Unread"}
                          </span>
                        </div>

                        {/* -- In-app reply -- */}
                        {expandedContact === m.id && (
                          <div
                            className="flex gap-2 mt-1 pt-2 border-t border-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/40"
                              placeholder={`Reply to ${m.name}�`}
                              value={replyText[m.id] ?? ""}
                              onChange={(e) => setReplyText((r) => ({ ...r, [m.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(m.id); }}
                            />
                            <button
                              onClick={() => handleSendReply(m.id)}
                              disabled={!replyText[m.id]?.trim() || sendingReply === m.id}
                              className="text-xs font-extrabold px-4 py-2 rounded-lg bg-white text-[#387a4b] hover:bg-green-100 disabled:opacity-50 transition-colors shrink-0"
                            >
                              {sendingReply === m.id ? "�" : "Send Reply"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeNav === "tenant-messages" && (
            <div className="flex gap-4 h-[calc(100vh-140px)] min-h-[420px]">
              <div className="w-72 shrink-0 rounded-xl border border-white/20 overflow-y-auto" style={{ backgroundColor: "#3c754b" }}>
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-extrabold text-white">Tenant Conversations ({tenantThreads.length})</p>
                  <p className="text-[10px] text-white/60 mt-0.5">Messages sent to landlords about properties</p>
                </div>
                {tenantThreads.map((thread) => (
                  <button
                    key={`${thread.property_id}-${thread.tenant_email}`}
                    onClick={() => openTenantThread(thread)}
                    className={`w-full text-left px-4 py-3 border-b border-white/10 transition-colors ${activeTenantThread?.property_id === thread.property_id && activeTenantThread?.tenant_email === thread.tenant_email ? "bg-white/20" : "hover:bg-white/10"}`}
                  >
                    <p className="text-xs font-bold text-white truncate">{thread.tenant_name}</p>
                    <p className="text-[10px] text-white/60 truncate">{thread.property_title}</p>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">{thread.last_message}</p>
                  </button>
                ))}
                {tenantThreads.length === 0 && <p className="px-4 py-8 text-center text-xs text-white/60">No tenant property messages yet.</p>}
              </div>

              <div className="flex-1 rounded-xl border border-green-200 bg-white shadow-sm flex flex-col overflow-hidden">
                {!activeTenantThread ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-[#64806a]">Select a tenant conversation</div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-green-100">
                      <p className="text-sm font-extrabold text-[#244b30]">{activeTenantThread.tenant_name}</p>
                      <p className="text-[10px] text-[#64806a]">{activeTenantThread.tenant_email} · {activeTenantThread.property_title}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                      {tenantThreadMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-[#64806a]">No messages in this conversation yet.</div>
                      ) : tenantThreadMessages.map((message) => {
                        const isAdminMessage = message.sender_email?.toLowerCase() === userEmail.toLowerCase();
                        return (
                          <div key={message.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isAdminMessage ? "bg-[#315f40] text-white" : "bg-[#edf7ee] text-[#244b30]"}`}>
                              {!isAdminMessage && <p className="mb-0.5 text-[10px] font-bold opacity-70">{message.sender_name || activeTenantThread.tenant_name}</p>}
                              <p>{message.content}</p>
                              <p className={`mt-0.5 text-[9px] ${isAdminMessage ? "text-white/60 text-right" : "text-[#78917e]"}`}>{new Date(message.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={tenantChatBottomRef} />
                    </div>
                    <form onSubmit={handleSendTenantReply} className="px-4 py-3 border-t border-green-100 flex gap-2">
                      <input
                        value={tenantReply}
                        onChange={(e) => setTenantReply(e.target.value)}
                        placeholder={`Reply to ${activeTenantThread.tenant_name}...`}
                        className="flex-1 rounded-lg border border-green-200 bg-[#f6fbf6] px-3 py-2 text-xs text-[#244b30] outline-none focus:ring-1 focus:ring-green-300"
                      />
                      <button type="submit" disabled={sendingTenantReply || !tenantReply.trim()} className="rounded-lg bg-[#315f40] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#244b30] disabled:opacity-50">
                        {sendingTenantReply ? "Sending..." : "Send"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* -- Landlord Chat -- */}
          {activeNav === "landlord-chat" && (
            <div className="flex gap-4 h-[calc(100vh-140px)]">
              {/* Thread list */}
              <div className="w-64 shrink-0 rounded-xl border border-green-200 bg-white shadow-sm overflow-y-auto">
                <div className="px-4 py-3 border-b border-green-100">
                  <p className="text-xs font-extrabold text-[#244b30]">Landlords ({users.filter(u => u.role === "landlord").length})</p>
                  <p className="text-[10px] text-[#64806a] mt-0.5">Direct messages with landlords</p>
                </div>
                {users.filter((u) => u.role === "landlord").map((u) => {
                  const existing = chatThreads.find((t) => t.other_email === u.email);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        const thread = existing ?? { thread_key: [userEmail, u.email].sort().join("__"), other_email: u.email, other_name: u.name, last_message: "", last_at: "", unread: 0 };
                        openChatThread(thread);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-green-100 transition-colors ${activeChatThread?.other_email === u.email ? "bg-green-100" : "hover:bg-green-50"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-[#244b30] capitalize">{u.name}</p>
                          <p className="text-[10px] text-[#64806a] truncate">{u.email}</p>
                          {existing?.last_message && <p className="text-[10px] text-[#78917e] truncate mt-0.5">{existing.last_message}</p>}
                        </div>
                        {(existing?.unread ?? 0) > 0 && (
                          <span className="w-4 h-4 bg-lime-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">{existing!.unread}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {users.filter((u) => u.role === "landlord").length === 0 && (
                  <p className="text-xs text-[#64806a] text-center py-8">No landlords found.</p>
                )}
              </div>
              {/* Chat pane */}
              <div className="flex-1 rounded-xl border border-green-200 bg-white shadow-sm flex flex-col overflow-hidden">
                {!activeChatThread ? (
                  <div className="flex-1 flex items-center justify-center flex-col gap-2 text-[#64806a]">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    <p className="text-sm">Select a landlord to start chatting</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-green-100">
                      <p className="text-xs font-extrabold text-[#244b30] capitalize">{activeChatThread.other_name}</p>
                      <p className="text-[10px] text-[#64806a]">{activeChatThread.other_email}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                      {chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-[#64806a] text-xs">No messages yet. Start the conversation!</div>
                      ) : chatMessages.map((m) => {
                        const isMe = m.sender_email === userEmail;
                        return (
                          <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${isMe ? "bg-[#315f40] text-white font-medium" : "bg-[#f1f8f2] border border-green-100 text-[#244b30]"}`}>
                              {!isMe && <p className="text-[10px] font-bold mb-0.5 text-[#64806a]">{m.sender_name}</p>}
                              <p>{m.content}</p>
                              <p className={`text-[9px] mt-0.5 ${isMe ? "text-white/70 text-right" : "text-[#78917e]"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatBottomRef} />
                    </div>
                    <form onSubmit={handleSendChat} className="px-4 py-3 border-t border-green-100 flex gap-2">
                      <input
                        className="flex-1 bg-[#f6fbf6] border border-green-200 rounded-lg px-3 py-2 text-xs text-[#244b30] placeholder-[#78917e] outline-none focus:ring-1 focus:ring-green-300"
                        placeholder="Type a message to this landlord..."
                        value={chatMsg}
                        onChange={(e) => setChatMsg(e.target.value)}
                      />
                      <button type="submit" disabled={sendingChat || !chatMsg.trim()} className="bg-[#315f40] text-white text-xs font-extrabold px-4 py-2 rounded-lg hover:bg-[#244b30] disabled:opacity-50 transition-colors">
                        {sendingChat ? "..." : "Send"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* -- Announcements -- */}
          {activeNav === "announce" && (
            <div className="flex flex-col gap-5">
              <div className="bg-white border border-green-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-[#244b30] mb-4">Post Announcement</h2>
                <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs text-[#244b30] placeholder-[#78917e] bg-[#f6fbf6] outline-none focus:ring-1 focus:ring-green-300 resize-none"
                    placeholder="Write a notice visible to all users on the home page..."
                    value={announceMsg}
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                  />
                  <div className="flex gap-2 items-center">
                    <select className="border border-green-200 rounded-lg px-3 py-1.5 text-xs bg-[#f6fbf6] text-[#244b30] outline-none focus:ring-1 focus:ring-green-300" value={announceType} onChange={(e) => setAnnounceType(e.target.value)}>
                      <option value="info" className="text-gray-900">Info</option>
                      <option value="warning" className="text-gray-900">Warning</option>
                      <option value="success" className="text-gray-900">Success</option>
                    </select>
                    <button type="submit" disabled={postingAnnounce} className="bg-[#315f40] text-white text-xs font-extrabold px-5 py-2 rounded-lg hover:bg-[#244b30] disabled:opacity-60 transition-colors">
                      {postingAnnounce ? "Posting..." : "Post Announcement"}
                    </button>
                  </div>
                </form>
              </div>
              <div className="bg-white border border-green-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-[#244b30] mb-4">Active Announcements ({announcements.length})</h2>
                {announcements.length === 0 ? (
                  <p className="text-xs text-[#64806a] text-center py-6">No announcements yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {announcements.map((a) => {
                      const styles: Record<string, string> = { info: "bg-green-100 border-green-300 text-[#244b30]", warning: "bg-amber-100 border-amber-300 text-amber-900", success: "bg-emerald-100 border-emerald-300 text-emerald-900" };
                      return (
                        <div key={a.id} className={`border rounded-lg px-4 py-3 flex items-start justify-between gap-3 shadow-sm ${styles[a.type] ?? styles.info}`}>
                          <div>
                            <p className="text-xs font-semibold">{a.message}</p>
                            <p className="text-[10px] mt-0.5 opacity-70">
                              By <span className="font-bold">{a.posted_by ?? "Admin"}</span> - {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(a.id)} aria-label="Delete announcement" className="text-current opacity-60 hover:opacity-100 shrink-0"><X className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* -- Add Property Modal -- */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#315f40] border border-white/20 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-extrabold text-white">Add New Property</h2>
          <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} aria-label="Close" className="text-white/60 hover:text-white/90"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 flex flex-col gap-3">
              {addError && <p className="text-lime-500 text-xs bg-lime-500/20 border border-red-400/20 rounded px-3 py-2">{addError}</p>}
              <PropertyFields f={addForm} setF={setAddForm} newPreviews={addPreviews} onRemoveNew={removeAddImage} onAddImages={addImages} fileRef={addFileRef} users={users} />
              <div>
                <label className="text-xs font-semibold text-white">Location on Map *</label>
                <p className="text-[10px] text-white/50 mb-1">Pin a location � address will be auto-filled.</p>
                <MapPicker
                  lat={addLatLng.lat} lng={addLatLng.lng}
                  onChange={(lat, lng) => setAddLatLng({ lat, lng })}
                  onAddress={(addr) => setAddForm((f) => ({ ...f, location: addr }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} className="flex-1 border border-white/20 text-white text-xs font-bold py-2 rounded-lg hover:bg-white/10">Cancel</button>
                <button type="submit" disabled={addSaving} className="flex-1 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-60">{addSaving ? "Saving..." : "Add Property"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -- Edit Property Modal -- */}
      {editProp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#315f40] border border-white/20 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-extrabold text-white">Edit Property</h2>
          <button onClick={() => setEditProp(null)} aria-label="Close" className="text-white/60 hover:text-white/90"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-5 flex flex-col gap-3">
              {editError && <p className="text-lime-500 text-xs bg-lime-500/20 border border-red-400/20 rounded px-3 py-2">{editError}</p>}
              <PropertyFields f={editForm} setF={setEditForm} existingImgs={editExisting} onRemoveExisting={(i) => setEditExisting((p) => p.filter((_, j) => j !== i))} newPreviews={editPreviews} onRemoveNew={removeEditNewImage} onAddImages={editImages} fileRef={editFileRef} users={users} />
              <div>
                <label className="text-xs font-semibold text-white">Location on Map</label>
                <p className="text-[10px] text-white/50 mb-1">
                  {editLatLng.lat ? "Location pinned � drag marker to update." : "Click the map to pin a location � address will be auto-filled."}
                </p>
                <MapPicker
                  lat={editLatLng.lat} lng={editLatLng.lng}
                  onChange={(lat, lng) => setEditLatLng({ lat, lng })}
                  onAddress={(addr) => setEditForm((f) => ({ ...f, location: addr }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditProp(null)} className="flex-1 border border-white/20 text-white text-xs font-bold py-2 rounded-lg hover:bg-white/10">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-60">{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
