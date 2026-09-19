"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import Image from "next/image";

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

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

type Booking = {
  id: string;
  user_name: string;
  user_email: string;
  move_in_date: string;
  message: string;
  status: string;
  created_at: string;
  properties: { title: string; location: string; price: string; images: string[] };
};

const stats = [
  { label: "Total Properties", icon: "🏠", color: "bg-blue-50 text-blue-600" },
  { label: "Total Users", value: "1,200", icon: "👥", color: "bg-green-50 text-green-600" },
  { label: "Bookings", value: "340", icon: "📋", color: "bg-yellow-50 text-yellow-600" },
  { label: "Revenue", value: "₱2.4M", icon: "💰", color: "bg-red-50 text-red-600" },
];

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "properties", label: "Properties", icon: "🏠" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "bookings", label: "Bookings", icon: "📋" },
];

const statusColor: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Booked: "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

const emptyForm = { title: "", location: "", price: "", status: "Available", description: "", beds: "", baths: "", sqm: "" };

export default function AdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [userName, setUserName] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editNewPreviews, setEditNewPreviews] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    setUserName(session.name || session.email);
    fetchProperties();
    fetchUsers();
    fetchBookings();
  }, [router]);

  async function fetchProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) setProperties(await res.json());
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  async function fetchBookings() {
    const res = await fetch("/api/bookings");
    if (res.ok) setBookings(await res.json());
  }

  async function handleBookingStatus(id: string, status: string) {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  }

  function handleImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    setImageFiles((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.location || !form.price) { setError("Title, location and price are required."); return; }
    setSaving(true);
    setError("");

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("location", form.location);
    fd.append("price", form.price);
    fd.append("status", form.status);
    fd.append("description", form.description);
    fd.append("beds", form.beds);
    fd.append("baths", form.baths);
    fd.append("sqm", form.sqm);
    imageFiles.forEach((f) => fd.append("images", f));

    const res = await fetch("/api/properties", { method: "POST", body: fd });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error); return; }
    setProperties((prev) => [data, ...prev]);
    setShowModal(false);
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
  }

  function openEditModal(property: Property) {
    setEditingProperty(property);
    setEditForm({
      title: property.title,
      location: property.location,
      price: property.price,
      status: property.status,
      description: property.description ?? "",
      beds: property.beds != null ? String(property.beds) : "",
      baths: property.baths != null ? String(property.baths) : "",
      sqm: property.sqm != null ? String(property.sqm) : "",
    });
    setEditExistingImages(property.images ?? []);
    setEditNewFiles([]);
    setEditNewPreviews([]);
    setEditError("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingProperty(null);
    setEditNewFiles([]);
    setEditNewPreviews([]);
  }

  function handleEditImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    setEditNewFiles((prev) => [...prev, ...newFiles]);
    setEditNewPreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  }

  function removeEditExistingImage(index: number) {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeEditNewImage(index: number) {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== index));
    setEditNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleEditProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.title || !editForm.location || !editForm.price) { setEditError("Title, location and price are required."); return; }
    if (!editingProperty) return;
    setEditSaving(true);
    setEditError("");

    const fd = new FormData();
    fd.append("title", editForm.title);
    fd.append("location", editForm.location);
    fd.append("price", editForm.price);
    fd.append("status", editForm.status);
    fd.append("description", editForm.description);
    fd.append("beds", editForm.beds);
    fd.append("baths", editForm.baths);
    fd.append("sqm", editForm.sqm);
    fd.append("existingImages", JSON.stringify(editExistingImages));
    editNewFiles.forEach((f) => fd.append("images", f));

    const res = await fetch(`/api/properties/${editingProperty.id}`, { method: "PATCH", body: fd });
    const data = await res.json();
    setEditSaving(false);

    if (!res.ok) { setEditError(data.error); return; }
    setProperties((prev) => prev.map((p) => p.id === editingProperty.id ? data : p));
    closeEditModal();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property?")) return;
    const res = await fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setProperties((prev) => prev.filter((p) => p.id !== id));
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  // Shared form fields for Add and Edit modals
  function PropertyFormFields({
    f, setF, existingImgs, onRemoveExisting, newPreviews, onRemoveNew, onAddImages, fileRef,
  }: {
    f: typeof emptyForm;
    setF: (v: typeof emptyForm) => void;
    existingImgs?: string[];
    onRemoveExisting?: (i: number) => void;
    newPreviews: string[];
    onRemoveNew: (i: number) => void;
    onAddImages: (files: FileList | null) => void;
    fileRef: React.RefObject<HTMLInputElement | null>;
  }) {
    return (
      <>
        <div>
          <label className="text-xs font-semibold text-gray-700">Title *</label>
          <input className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Cozy Studio House" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Location *</label>
          <input className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="e.g. Quezon City" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Price *</label>
          <input className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="e.g. ₱25,000/mo" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Status</label>
          <select className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option>Available</option>
            <option>Booked</option>
            <option>Maintenance</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Beds</label>
            <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} placeholder="3" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Baths</label>
            <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.baths} onChange={(e) => setF({ ...f, baths: e.target.value })} placeholder="2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Sqm</label>
            <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400" value={f.sqm} onChange={(e) => setF({ ...f, sqm: e.target.value })} placeholder="80" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Description</label>
          <textarea className="w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 resize-none" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional description..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Images</label>
          {existingImgs && existingImgs.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-400 mb-1">Current images — hover to remove</p>
              <div className="flex flex-wrap gap-2">
                {existingImgs.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                    <Image src={src} alt={`existing-${i}`} fill sizes="64px" className="object-cover" />
                    <button type="button" onClick={() => onRemoveExisting?.(i)} className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div
            className="mt-0.5 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onAddImages(e.dataTransfer.files); }}
          >
            <p className="text-xs text-gray-400">Click or drag & drop to add images</p>
            <p className="text-[10px] text-gray-300 mt-0.5">PNG, JPG, WEBP supported</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAddImages(e.target.files)} />
          </div>
          {newPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newPreviews.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                  <Image src={src} alt={`new-${i}`} fill sizes="64px" className="object-cover" />
                  <button type="button" onClick={() => onRemoveNew(i)} className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <span className="text-lg font-extrabold">
            HOME<span className="text-red-500">R</span><span className="text-red-500 italic">ent</span>
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                activeNav === item.key ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-2 px-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 truncate">{userName}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-gray-800 capitalize">{activeNav}</h1>
          <span className="text-sm text-gray-500">Welcome, <span className="font-semibold text-gray-700">{userName}</span></span>
        </div>

        <div className="p-6">

          {/* Dashboard */}
          {activeNav === "dashboard" && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-2xl font-extrabold text-gray-800">{s.label === "Total Properties" ? properties.length : s.label === "Total Users" ? users.length : s.label === "Bookings" ? bookings.length : s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Recent Properties</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b">
                      <th className="text-left pb-2 font-semibold">Property</th>
                      <th className="text-left pb-2 font-semibold">Location</th>
                      <th className="text-left pb-2 font-semibold">Price</th>
                      <th className="text-left pb-2 font-semibold">Status</th>
                    </tr></thead>
                    <tbody>
                      {properties.slice(0, 5).map((h) => (
                        <tr key={h.id} className="border-b last:border-0">
                          <td className="py-2.5 flex items-center gap-2">
                            {h.images?.[0] && (
                              <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                <Image src={h.images[0]} alt={h.title} fill sizes="32px" className="object-cover" />
                              </div>
                            )}
                            <span className="font-medium text-gray-700">{h.title}</span>
                          </td>
                          <td className="py-2.5 text-gray-500">{h.location}</td>
                          <td className="py-2.5 font-semibold text-gray-700">{h.price}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[h.status] ?? "bg-gray-100 text-gray-600"}`}>{h.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-sm font-extrabold text-gray-800 mb-4">Recent Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b">
                      <th className="text-left pb-2 font-semibold">Name</th>
                      <th className="text-left pb-2 font-semibold">Email</th>
                      <th className="text-left pb-2 font-semibold">Role</th>
                      <th className="text-left pb-2 font-semibold">Joined</th>
                    </tr></thead>
                    <tbody>
                      {users.slice(0, 5).map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{u.name}</td>
                          <td className="py-2.5 text-gray-500">{u.email}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{u.role}</span>
                          </td>
                          <td className="py-2.5 text-gray-500">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={4} className="py-6 text-center text-gray-400">No registered users yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Properties */}
          {activeNav === "properties" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-800">All Properties</h2>
                <button onClick={() => { setShowModal(true); setError(""); }} className="bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700">
                  + Add Property
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Property</th>
                    <th className="text-left pb-2 font-semibold">Location</th>
                    <th className="text-left pb-2 font-semibold">Price</th>
                    <th className="text-left pb-2 font-semibold">Status</th>
                    <th className="text-left pb-2 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {properties.map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2.5 flex items-center gap-2">
                          {h.images?.[0] && (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                              <Image src={h.images[0]} alt={h.title} fill sizes="32px" className="object-cover" />
                            </div>
                          )}
                          <span className="font-medium text-gray-700">{h.title}</span>
                        </td>
                        <td className="py-2.5 text-gray-500">{h.location}</td>
                        <td className="py-2.5 font-semibold text-gray-700">{h.price}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[h.status] ?? "bg-gray-100 text-gray-600"}`}>{h.status}</span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-3">
                            <button onClick={() => openEditModal(h)} className="text-blue-500 hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:underline font-semibold">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No properties yet. Click + Add Property.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users */}
          {activeNav === "users" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-800">All Users</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Name</th>
                    <th className="text-left pb-2 font-semibold">Email</th>
                    <th className="text-left pb-2 font-semibold">Role</th>
                    <th className="text-left pb-2 font-semibold">Joined</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium text-gray-700">{u.name}</td>
                        <td className="py-2.5 text-gray-500">{u.email}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{u.role}</span>
                        </td>
                        <td className="py-2.5 text-gray-500">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-gray-400">No registered users yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings */}
          {activeNav === "bookings" && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-extrabold text-gray-800 mb-4">All Bookings</h2>
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
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2.5">
                          <p className="font-medium text-gray-700">{b.properties?.title ?? "—"}</p>
                          <p className="text-gray-400">{b.properties?.location ?? ""}</p>
                        </td>
                        <td className="py-2.5">
                          <p className="font-medium text-gray-700">{b.user_name}</p>
                          <p className="text-gray-400">{b.user_email}</p>
                        </td>
                        <td className="py-2.5 text-gray-500">{new Date(b.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === "Approved" ? "bg-green-100 text-green-700" :
                            b.status === "Rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-2.5">
                          {b.status === "Pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleBookingStatus(b.id, "Approved")} className="text-green-600 hover:underline font-semibold">Approve</button>
                              <button onClick={() => handleBookingStatus(b.id, "Rejected")} className="text-red-500 hover:underline font-semibold">Reject</button>
                            </div>
                          )}
                          {b.status !== "Pending" && <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No bookings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Property Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-gray-800">Add New Property</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); setImageFiles([]); setImagePreviews([]); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAddProperty} className="p-5 flex flex-col gap-3">
              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
              <PropertyFormFields
                f={form} setF={setForm}
                newPreviews={imagePreviews}
                onRemoveNew={removeImage}
                onAddImages={handleImages}
                fileRef={fileInputRef}
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); setImageFiles([]); setImagePreviews([]); }} className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60">
                  {saving ? "Saving..." : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && editingProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-extrabold text-gray-800">Edit Property</h2>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleEditProperty} className="p-5 flex flex-col gap-3">
              {editError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</p>}
              <PropertyFormFields
                f={editForm} setF={setEditForm}
                existingImgs={editExistingImages}
                onRemoveExisting={removeEditExistingImage}
                newPreviews={editNewPreviews}
                onRemoveNew={removeEditNewImage}
                onAddImages={handleEditImages}
                fileRef={editFileInputRef}
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeEditModal} className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-500 disabled:opacity-60">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
