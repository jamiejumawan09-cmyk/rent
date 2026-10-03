"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────
type Property = {
  id: string; title: string; location: string; price: string;
  status: string; description: string; images: string[];
  beds?: number; baths?: number; sqm?: number;
  landlord_email?: string; landlord_name?: string;
};
type User = { id: string; name: string; email: string; role: string; created_at: string; is_verified: boolean; is_banned?: boolean };
type AuditLog = { id: string; actor_email: string; actor_role: string; action: string; target?: string; details?: string; created_at: string };
type Booking = {
  id: string; user_name: string; user_email: string;
  move_in_date: string; message: string; status: string; created_at: string;
  properties: { title: string; location: string; price: string; images: string[] };
};
type Review = {
  id: string; property_id: string; user_email: string; user_name: string;
  rating: number; comment: string; created_at: string;
  properties?: { title: string };
};

const emptyForm = { title: "", location: "", price: "", status: "Available", description: "", beds: "", baths: "", sqm: "", landlord_email: "", landlord_name: "" };

const navItems = [
  { key: "dashboard",  label: "Dashboard",  icon: "📊" },
  { key: "properties", label: "Properties", icon: "🏠" },
  { key: "users",      label: "Users",      icon: "👥" },
  { key: "bookings",   label: "Bookings",   icon: "📋" },
  { key: "reviews",    label: "Reviews",    icon: "⭐" },
  { key: "analytics", label: "Analytics",  icon: "📈" },
  { key: "audit",      label: "Audit Logs", icon: "🔍" },
  { key: "approvals",  label: "Approvals",  icon: "✅" },
  { key: "announce",   label: "Announcements", icon: "📢" },
];

const statusColor: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Booked:    "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

const bookingStatusColor: Record<string, string> = {
  Pending:   "bg-yellow-100 text-yellow-700",
  Approved:  "bg-green-100 text-green-700",
  Rejected:  "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

// ── Shared form fields ─────────────────────────────────────
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
      {(["title", "location", "price"] as const).map((field) => (
        <div key={field}>
          <label className="text-xs font-semibold text-gray-700 capitalize">{field} *</label>
          <input className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })} placeholder={field === "price" ? "e.g. ₱25,000/mo" : ""} />
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold text-gray-700">Status</label>
        <select className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option>Available</option><option>Booked</option><option>Maintenance</option>
        </select>
      </div>
      {/* Assign to landlord — only shown in admin context */}
      {users && (
        <div>
          <label className="text-xs font-semibold text-gray-700">Assign to Landlord</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
            value={f.landlord_email ?? ""}
            onChange={(e) => {
              const selected = users.find((u) => u.email === e.target.value);
              setF({ ...f, landlord_email: e.target.value, landlord_name: selected?.name ?? "" } as typeof emptyForm);
            }}
          >
            <option value="">— Unassigned —</option>
            {users.filter((u) => u.role === "landlord").map((u) => (
              <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {(["beds", "baths", "sqm"] as const).map((field) => (
          <div key={field}>
            <label className="text-xs font-semibold text-gray-700 capitalize">{field}</label>
            <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f[field]} onChange={(e) => setF({ ...f, [field]: e.target.value })} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-700">Description</label>
        <textarea rows={3} className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 resize-none" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional description..." />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-700">Images</label>
        {existingImgs && existingImgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 mt-1">
            {existingImgs.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border group">
                <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                <button type="button" onClick={() => onRemoveExisting?.(i)} className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-0.5 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-gray-400" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onAddImages(e.dataTransfer.files); }}>
          <p className="text-xs text-gray-400">Click or drag & drop images</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAddImages(e.target.files)} />
        </div>
        {newPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {newPreviews.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border group">
                <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                <button type="button" onClick={() => onRemoveNew(i)} className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Stars ──────────────────────────────────────────────────
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

// ── Main ───────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [userName, setUserName]   = useState("");

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
  const [addError, setAddError]       = useState("");
  const addFileRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editProp, setEditProp]         = useState<Property | null>(null);
  const [editForm, setEditForm]         = useState(emptyForm);
  const [editExisting, setEditExisting] = useState<string[]>([]);
  const [editFiles, setEditFiles]       = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [bookingFilter, setBookingFilter] = useState("All");
  const [userSearch, setUserSearch]       = useState("");
  const [reviewSearch, setReviewSearch]   = useState("");
  const [updatingRole, setUpdatingRole]   = useState<string | null>(null);
  const [updatingBan, setUpdatingBan]     = useState<string | null>(null);
  const [auditLogs, setAuditLogs]         = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch]     = useState("");

  // Approvals (pending landlord-submitted properties)
  type PendingProp = Property & { submitted_by?: string };
  const [pendingProps, setPendingProps]   = useState<PendingProp[]>([]);

  // Announcements
  type Announcement = { id: string; message: string; type: string; created_at: string };
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [announceMsg, setAnnounceMsg]         = useState("");
  const [announceType, setAnnounceType]       = useState("info");
  const [postingAnnounce, setPostingAnnounce] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") { router.replace("/login"); return; }
    setUserName(s.name || s.email);
    fetchAll();
  }, [router]);

  async function fetchAll() {
    const [propsRes, usersRes, booksRes, auditRes] = await Promise.all([
      fetch("/api/properties?admin=1"), fetch("/api/users"), fetch("/api/bookings"), fetch("/api/audit-logs"),
    ]);
    const props = propsRes.ok ? await propsRes.json() : [];
    if (Array.isArray(props)) setProperties(props);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (booksRes.ok) setBookings(await booksRes.json());
    if (auditRes.ok) setAuditLogs(await auditRes.json());

    // Pending approvals: properties with status "Pending"
    if (Array.isArray(props)) setPendingProps(props.filter((p: Property) => p.status === "Pending"));

    // Announcements
    const annRes = await fetch("/api/announcements");
    if (annRes.ok) setAnnouncements(await annRes.json());

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

  // ── Images helpers ─────────────────────────────────────
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

  // ── CRUD ───────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.title || !addForm.location || !addForm.price) { setAddError("Title, location and price are required."); return; }
    setAddSaving(true); setAddError("");
    const fd = new FormData();
    Object.entries(addForm).forEach(([k, v]) => fd.append(k, v));
    addFiles.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/properties", { method: "POST", body: fd });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error); return; }
    setProperties((p) => [data, ...p]);
    setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]);
  }

  function openEdit(p: Property) {
    setEditProp(p);
    setEditForm({ title: p.title, location: p.location, price: p.price, status: p.status, description: p.description ?? "", beds: p.beds != null ? String(p.beds) : "", baths: p.baths != null ? String(p.baths) : "", sqm: p.sqm != null ? String(p.sqm) : "", landlord_email: p.landlord_email ?? "", landlord_name: p.landlord_name ?? "" });
    setEditExisting(p.images ?? []); setEditFiles([]); setEditPreviews([]); setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProp || !editForm.title || !editForm.location || !editForm.price) { setEditError("Required fields missing."); return; }
    setEditSaving(true); setEditError("");
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => fd.append(k, v));
    fd.append("existingImages", JSON.stringify(editExisting));
    editFiles.forEach((f) => fd.append("images", f));
    const res = await fetch(`/api/properties/${editProp.id}`, { method: "PATCH", body: fd });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error); return; }
    setProperties((p) => p.map((x) => x.id === editProp.id ? data : x));
    setEditProp(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property?")) return;
    const prop = properties.find((p) => p.id === id);
    const res = await fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { setProperties((p) => p.filter((x) => x.id !== id)); writeAuditLog("delete_property", prop?.title); }
  }

  async function handleBookingStatus(id: string, status: string) {
    const res = await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (res.ok) { setBookings((b) => b.map((x) => x.id === id ? { ...x, status } : x)); writeAuditLog("booking_status", id, status); }
  }

  async function handleDeleteReview(id: string, user_email: string) {
    if (!confirm("Delete this review?")) return;
    await fetch("/api/reviews", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, user_email }) });
    setReviews((r) => r.filter((x) => x.id !== id));
    writeAuditLog("delete_review", user_email);
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
      writeAuditLog("role_change", user?.email, `Changed role to ${role}`);
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
      writeAuditLog(is_banned ? "ban_user" : "unban_user", user?.email);
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
      writeAuditLog("approve_property", id);
    }
  }

  async function handleRejectProperty(id: string) {
    if (!confirm("Reject and delete this property submission?")) return;
    const res = await fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) {
      setPendingProps((p) => p.filter((x) => x.id !== id));
      setProperties((p) => p.filter((x) => x.id !== id));
      writeAuditLog("reject_property", id);
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
      body: JSON.stringify({ message: announceMsg, type: announceType }),
    });
    const data = await res.json();
    setPostingAnnounce(false);
    if (res.ok) { setAnnouncements((prev) => [data, ...prev]); setAnnounceMsg(""); }
  }

  async function handleDeleteAnnouncement(id: string) {
    await fetch("/api/announcements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Derived ─────────────────────────────────────────────
  const pendingBookings   = bookings.filter((b) => b.status === "Pending").length;
  const approvedBookings  = bookings.filter((b) => b.status === "Approved").length;
  const filteredBookings  = bookingFilter === "All" ? bookings : bookings.filter((b) => b.status === bookingFilter);
  const filteredUsers     = users.filter((u) => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredReviews   = reviews.filter((r) => r.user_name?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.properties?.title?.toLowerCase().includes(reviewSearch.toLowerCase()));
  const avgRating         = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const filteredAudit     = auditLogs.filter((l) => !auditSearch || l.actor_email?.includes(auditSearch) || l.action?.includes(auditSearch) || l.target?.includes(auditSearch));
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
    <div className="flex min-h-screen bg-gray-100">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <span className="text-lg font-extrabold">HOME<span className="text-red-500">R</span><span className="text-red-500 italic">ent</span></span>
          <p className="text-[10px] text-gray-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => setActiveNav(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeNav === item.key ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              <span>{item.icon}</span>{item.label}
              {item.key === "bookings" && pendingBookings > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingBookings}</span>
              )}
              {item.key === "approvals" && pendingApprovals > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingApprovals}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-2 px-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">{userName.charAt(0).toUpperCase()}</div>
            <span className="text-xs text-gray-300 truncate">{userName}</span>
          </div>
          <button onClick={() => { clearSession(); router.push("/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-gray-800 capitalize">{activeNav}</h1>
          <span className="text-sm text-gray-500">Welcome, <span className="font-semibold text-gray-700">{userName}</span></span>
        </div>

        <div className="p-6">

          {/* ── Dashboard ── */}
          {activeNav === "dashboard" && (
            <div className="flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Properties", value: properties.length,  icon: "🏠", color: "bg-blue-50 text-blue-600" },
                  { label: "Total Users",       value: users.length,       icon: "👥", color: "bg-green-50 text-green-600" },
                  { label: "Total Bookings",    value: bookings.length,    icon: "📋", color: "bg-yellow-50 text-yellow-600" },
                  { label: "Pending Bookings",  value: pendingBookings,    icon: "🕐", color: "bg-red-50 text-red-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Available Props",   value: properties.filter((p) => p.status === "Available").length,  icon: "✅", color: "bg-green-50 text-green-600" },
                  { label: "Approved Bookings", value: approvedBookings, icon: "📝", color: "bg-blue-50 text-blue-600" },
                  { label: "Total Reviews",     value: reviews.length,  icon: "⭐", color: "bg-yellow-50 text-yellow-600" },
                  { label: "Avg Rating",        value: avgRating,       icon: "🏆", color: "bg-purple-50 text-purple-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Booking status breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h2 className="text-sm font-extrabold text-gray-800 mb-4">Booking Breakdown</h2>
                  {[
                    { label: "Pending",   count: bookings.filter((b) => b.status === "Pending").length,   color: "bg-yellow-400" },
                    { label: "Approved",  count: bookings.filter((b) => b.status === "Approved").length,  color: "bg-green-500" },
                    { label: "Rejected",  count: bookings.filter((b) => b.status === "Rejected").length,  color: "bg-red-500" },
                    { label: "Cancelled", count: bookings.filter((b) => b.status === "Cancelled").length, color: "bg-gray-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                      <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                      <span className="text-xs font-bold text-gray-800">{s.count}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full`} style={{ width: bookings.length ? `${(s.count / bookings.length) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h2 className="text-sm font-extrabold text-gray-800 mb-4">Recent Registrations</h2>
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{u.name?.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No users yet.</p>}
                </div>
              </div>

              {/* Recent reviews */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Recent Reviews</h2>
                {reviews.slice(0, 4).length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No reviews yet.</p> : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {reviews.slice(0, 4).map((r) => (
                      <div key={r.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-gray-800">{r.user_name}</p>
                          <Stars rating={r.rating} />
                        </div>
                        <p className="text-[10px] text-gray-400 mb-1">{r.properties?.title}</p>
                        {r.comment && <p className="text-xs text-gray-500 line-clamp-2">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Properties ── */}
          {activeNav === "properties" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-800">All Properties ({properties.length})</h2>
                <button onClick={() => { setShowAdd(true); setAddError(""); }} className="bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700">+ Add Property</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Property</th>
                    <th className="text-left pb-2 font-semibold">Location</th>
                    <th className="text-left pb-2 font-semibold">Price</th>
                    <th className="text-left pb-2 font-semibold">Landlord</th>
                    <th className="text-left pb-2 font-semibold">Status</th>
                    <th className="text-left pb-2 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {properties.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2.5 flex items-center gap-2">
                          {p.images?.[0] && <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0"><Image src={p.images[0]} alt={p.title} fill sizes="32px" className="object-cover" /></div>}
                          <span className="font-medium text-gray-700 truncate max-w-[100px]">{p.title}</span>
                        </td>
                        <td className="py-2.5 text-gray-500 max-w-[80px] truncate">{p.location}</td>
                        <td className="py-2.5 font-semibold text-gray-700">{p.price}</td>
                        <td className="py-2.5 text-gray-400 max-w-[80px] truncate">{p.landlord_name || "—"}</td>
                        <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</span></td>
                        <td className="py-2.5">
                          <div className="flex gap-3">
                            <button onClick={() => openEdit(p)} className="text-blue-500 hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline font-semibold">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No properties yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {activeNav === "users" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-gray-800">All Users ({users.length})</h2>
                <div className="flex gap-2">
                  <input className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-300 w-48" placeholder="Search name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  <button onClick={() => exportCSV("users")} className="border text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">⬇️ CSV</button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">Change a user&apos;s role to <strong>landlord</strong> to grant them access to the Landlord Dashboard.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">User</th>
                    <th className="text-left pb-2 font-semibold">Email</th>
                    <th className="text-left pb-2 font-semibold">Role</th>
                    <th className="text-left pb-2 font-semibold">Verified</th>
                    <th className="text-left pb-2 font-semibold">Joined</th>
                    <th className="text-left pb-2 font-semibold">Change Role</th>
                    <th className="text-left pb-2 font-semibold">Ban</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2.5 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${u.role === "landlord" ? "bg-blue-600" : u.role === "admin" ? "bg-red-600" : "bg-gray-700"}`}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-700">{u.name}</span>
                        </td>
                        <td className="py-2.5 text-gray-500">{u.email}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === "landlord" ? "bg-blue-100 text-blue-700"
                            : u.role === "admin"  ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                          }`}>{u.role}</span>
                        </td>
                        <td className="py-2.5">{u.is_verified ? <span className="text-green-600 font-bold">✅</span> : <span className="text-gray-400">—</span>}</td>
                        <td className="py-2.5 text-gray-500">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="py-2.5">
                          {u.email === "admin@homerent.ph" ? (
                            <span className="text-[10px] text-gray-400 italic">Protected</span>
                          ) : (
                            <select
                              disabled={updatingRole === u.id}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="border rounded px-2 py-1 text-xs bg-white outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-60"
                            >
                              <option value="user">user</option>
                              <option value="landlord">landlord</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2.5">
                          {u.email !== "admin@homerent.ph" && (
                            <button
                              disabled={updatingBan === u.id}
                              onClick={() => handleBan(u.id, !u.is_banned)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg disabled:opacity-60 ${
                                u.is_banned ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                              }`}
                            >
                              {updatingBan === u.id ? "..." : u.is_banned ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Bookings ── */}
          {activeNav === "bookings" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-gray-800">All Bookings ({bookings.length})</h2>
                <div className="flex gap-2">
                  <select className="border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-gray-300" value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button onClick={() => exportCSV("bookings")} className="border text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">⬇️ CSV</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Property</th>
                    <th className="text-left pb-2 font-semibold">Tenant</th>
                    <th className="text-left pb-2 font-semibold">Move-in</th>
                    <th className="text-left pb-2 font-semibold">Status</th>
                    <th className="text-left pb-2 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2.5">
                          <p className="font-medium text-gray-700">{b.properties?.title ?? "—"}</p>
                          <p className="text-gray-400">{b.properties?.location}</p>
                        </td>
                        <td className="py-2.5">
                          <p className="font-medium text-gray-700">{b.user_name}</p>
                          <p className="text-gray-400">{b.user_email}</p>
                        </td>
                        <td className="py-2.5 text-gray-500">{new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bookingStatusColor[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.status}</span></td>
                        <td className="py-2.5">
                          {b.status === "Pending" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleBookingStatus(b.id, "Approved")} className="text-green-600 hover:underline font-semibold">Approve</button>
                              <button onClick={() => handleBookingStatus(b.id, "Rejected")} className="text-red-500 hover:underline font-semibold">Reject</button>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No {bookingFilter !== "All" ? bookingFilter.toLowerCase() + " " : ""}bookings.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          {activeNav === "reviews" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-gray-800">All Reviews ({reviews.length})</h2>
                <input className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-300 w-48" placeholder="Search reviewer or property..." value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} />
              </div>
              {reviews.length > 0 && (
                <p className="text-xs text-gray-400 mb-4">Average rating: <span className="font-bold text-gray-700">{avgRating} / 5</span></p>
              )}
              <div className="flex flex-col divide-y">
                {filteredReviews.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No reviews found.</p>
                ) : filteredReviews.map((r) => (
                  <div key={r.id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{r.user_name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{r.user_name}</p>
                          <p className="text-[10px] text-gray-400">{r.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Stars rating={r.rating} />
                          <p className="text-[10px] text-gray-400 mt-0.5">{r.properties?.title}</p>
                        </div>
                        <div className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <button onClick={() => handleDeleteReview(r.id, r.user_email)} className="text-red-400 hover:underline text-[10px] font-semibold">Delete</button>
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 mt-2 ml-10 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Analytics ── */}
          {activeNav === "analytics" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Bookings",    value: bookings.length,         icon: "📋", color: "bg-blue-50 text-blue-600" },
                  { label: "Approved Bookings", value: approvedBookings,         icon: "✅", color: "bg-green-50 text-green-600" },
                  { label: "Est. Revenue",       value: `₱${totalRevenue.toLocaleString()}`, icon: "💰", color: "bg-yellow-50 text-yellow-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Most Booked Properties</h2>
                {topProperties.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No booking data yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {topProperties.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-gray-400 w-5">#{i + 1}</span>
                        <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{p.title}</span>
                        <span className="text-xs font-bold text-gray-800">{p.count} booking{p.count !== 1 ? "s" : ""}</span>
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.count / (topProperties[0]?.count || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Booking Status Breakdown</h2>
                {["Pending","Approved","Rejected","Cancelled"].map((s) => {
                  const count = bookings.filter((b) => b.status === s).length;
                  const colors: Record<string,string> = { Pending:"bg-yellow-400", Approved:"bg-green-500", Rejected:"bg-red-500", Cancelled:"bg-gray-400" };
                  return (
                    <div key={s} className="flex items-center gap-3 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${colors[s]} shrink-0`} />
                      <span className="text-xs text-gray-600 flex-1">{s}</span>
                      <span className="text-xs font-bold text-gray-800">{count}</span>
                      <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[s]} rounded-full`} style={{ width: bookings.length ? `${(count/bookings.length)*100}%` : "0%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Audit Logs ── */}
          {activeNav === "audit" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-extrabold text-gray-800">Audit Logs ({auditLogs.length})</h2>
                <input className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-300 w-56" placeholder="Search email, action, target..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Time</th>
                    <th className="text-left pb-2 font-semibold">Actor</th>
                    <th className="text-left pb-2 font-semibold">Role</th>
                    <th className="text-left pb-2 font-semibold">Action</th>
                    <th className="text-left pb-2 font-semibold">Target</th>
                    <th className="text-left pb-2 font-semibold">Details</th>
                  </tr></thead>
                  <tbody>
                    {filteredAudit.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">No logs found.</td></tr>
                    ) : filteredAudit.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2 text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</td>
                        <td className="py-2 font-medium text-gray-700">{l.actor_email}</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ l.actor_role==="admin" ? "bg-red-100 text-red-700" : l.actor_role==="landlord" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600" }`}>{l.actor_role}</span></td>
                        <td className="py-2 font-mono text-gray-600">{l.action}</td>
                        <td className="py-2 text-gray-500 max-w-[120px] truncate">{l.target ?? "—"}</td>
                        <td className="py-2 text-gray-400 max-w-[120px] truncate">{l.details ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Approvals ── */}
          {activeNav === "approvals" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-extrabold text-gray-800 mb-4">Pending Property Approvals ({pendingApprovals})</h2>
              {pendingProps.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No pending submissions.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingProps.map((p) => (
                    <div key={p.id} className="border rounded-xl overflow-hidden flex flex-col sm:flex-row">
                      <div className="relative w-full sm:w-32 h-28 shrink-0 bg-gray-100">
                        {p.images?.[0] ? <Image src={p.images[0]} alt={p.title} fill sizes="128px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>}
                      </div>
                      <div className="flex-1 p-4">
                        <p className="text-xs font-extrabold text-gray-800">{p.title}</p>
                        <p className="text-[10px] text-gray-400 mb-1">{p.location} &bull; {p.price}</p>
                        <p className="text-[10px] text-gray-500 mb-3">Submitted by: {p.landlord_name || p.landlord_email || "—"}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveProperty(p.id)} className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-green-600">✅ Approve</button>
                          <button onClick={() => handleRejectProperty(p.id)} className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-600">❌ Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Announcements ── */}
          {activeNav === "announce" && (
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Post Announcement</h2>
                <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                    placeholder="Write a notice visible to all users on the home page..."
                    value={announceMsg}
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                  />
                  <div className="flex gap-2 items-center">
                    <select className="border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-gray-300" value={announceType} onChange={(e) => setAnnounceType(e.target.value)}>
                      <option value="info">ℹ️ Info</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="success">✅ Success</option>
                    </select>
                    <button type="submit" disabled={postingAnnounce} className="bg-gray-800 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">
                      {postingAnnounce ? "Posting..." : "Post Announcement"}
                    </button>
                  </div>
                </form>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Active Announcements ({announcements.length})</h2>
                {announcements.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No announcements yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {announcements.map((a) => {
                      const styles: Record<string, string> = { info: "bg-blue-50 border-blue-200 text-blue-800", warning: "bg-yellow-50 border-yellow-200 text-yellow-800", success: "bg-green-50 border-green-200 text-green-800" };
                      return (
                        <div key={a.id} className={`border rounded-lg px-4 py-3 flex items-start justify-between gap-3 ${styles[a.type] ?? styles.info}`}>
                          <div>
                            <p className="text-xs font-semibold">{a.message}</p>
                            <p className="text-[10px] mt-0.5 opacity-70">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-[10px] font-bold opacity-60 hover:opacity-100 shrink-0">✕</button>
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

      {/* ── Add Property Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-gray-800">Add New Property</h2>
              <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-5 flex flex-col gap-3">
              {addError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>}
              <PropertyFields f={addForm} setF={setAddForm} newPreviews={addPreviews} onRemoveNew={removeAddImage} onAddImages={addImages} fileRef={addFileRef} users={users} />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddFiles([]); setAddPreviews([]); }} className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={addSaving} className="flex-1 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">{addSaving ? "Saving..." : "Add Property"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Property Modal ── */}
      {editProp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-gray-800">Edit Property</h2>
              <button onClick={() => setEditProp(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleEdit} className="p-5 flex flex-col gap-3">
              {editError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</p>}
              <PropertyFields f={editForm} setF={setEditForm} existingImgs={editExisting} onRemoveExisting={(i) => setEditExisting((p) => p.filter((_, j) => j !== i))} newPreviews={editPreviews} onRemoveNew={removeEditNewImage} onAddImages={editImages} fileRef={editFileRef} users={users} />
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
