"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession, setSession } from "@/lib/session";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [form, setForm]                 = useState({ name: "", phone: "" });
  const [saving, setSaving]             = useState(false);
  const [saveSuccess, setSaveSuccess]   = useState("");
  const [saveError, setSaveError]       = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile]     = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change
  const [pwForm, setPwForm]           = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwError, setPwError]         = useState("");
  const [pwSuccess, setPwSuccess]     = useState("");

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }

    fetch(`/api/profile?email=${encodeURIComponent(s.email)}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setForm({ name: d.name ?? "", phone: d.phone ?? "" });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !profile) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("email", profile.email);
    fd.append("avatar", avatarFile);
    const res  = await fetch("/api/profile", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingAvatar(false);
    if (!res.ok) { setSaveError(data.error); return; }
    setProfile((p) => p ? { ...p, avatar_url: data.avatar_url } : p);
    setAvatarPreview(null);
    setAvatarFile(null);
    // Persist new avatar URL in session so header reflects it immediately
    const s = getSession();
    if (s) setSession({ ...s, avatar_url: data.avatar_url });
    setSaveSuccess("Avatar updated!");
    setTimeout(() => setSaveSuccess(""), 3000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwSaving(true); setPwError(""); setPwSuccess("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, current_password: pwForm.current, new_password: pwForm.next }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwError(data.error); return; }
    setPwSuccess("Password changed successfully!");
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSuccess(""), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.name.trim()) { setSaveError("Name is required."); return; }
    setSaving(true); setSaveError(""); setSaveSuccess("");

    const res  = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, name: form.name, phone: form.phone }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error); return; }

    setProfile(data);
    // Update session name so header reflects the change
    const s = getSession();
    if (s) setSession({ ...s, name: data.name });
    setSaveSuccess("Profile updated successfully!");
    setTimeout(() => setSaveSuccess(""), 3000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>;
  if (!profile) return null;

  const initials = profile.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <main className="min-h-screen bg-[#387a4b]">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-5 flex flex-col items-center gap-4">
          {/* Avatar display */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0 border-4 border-white shadow-md">
              {(avatarPreview ?? profile.avatar_url) ? (
                <Image
                  src={avatarPreview ?? profile.avatar_url!}
                  alt="Avatar"
                  width={96} height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center shadow hover:bg-gray-700 transition-colors"
              title="Change avatar"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />

          <div className="text-center">
            <p className="text-sm font-extrabold text-gray-800">{profile.name}</p>
            <p className="text-xs text-gray-400">{profile.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Avatar upload confirmation */}
          {avatarFile && (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                className="flex-1 border text-xs font-bold py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="flex-1 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60"
              >
                {uploadingAvatar ? "Uploading..." : "Save Avatar"}
              </button>
            </div>
          )}
        </div>

        {/* Info form */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-gray-800 mb-4">Personal Information</h2>

          {saveError   && <p className="text-lime-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{saveError}</p>}
          {saveSuccess && <p className="text-green-600 text-xs bg-green-50 border border-green-200 rounded px-3 py-2 mb-3">{saveSuccess}</p>}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Full Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Email Address</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5 bg-gray-50 text-gray-400 cursor-not-allowed"
                value={profile.email}
                disabled
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Email cannot be changed.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Phone Number</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+63 912 345 6789"
                type="tel"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setForm({ name: profile.name ?? "", phone: profile.phone ?? "" })}
                className="flex-1 border text-xs font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gray-800 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mt-5">
          <h2 className="text-sm font-extrabold text-gray-800 mb-4">Change Password</h2>
          {pwError   && <p className="text-lime-500 text-xs bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{pwError}</p>}
          {pwSuccess && <p className="text-green-600 text-xs bg-green-50 border border-green-200 rounded px-3 py-2 mb-3">{pwSuccess}</p>}
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            {(["current", "next", "confirm"] as const).map((f) => (
              <div key={f}>
                <label className="text-xs font-semibold text-gray-700 capitalize">
                  {f === "next" ? "New Password" : f === "confirm" ? "Confirm New Password" : "Current Password"}
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-gray-400"
                  value={pwForm[f]}
                  onChange={(e) => setPwForm({ ...pwForm, [f]: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={pwSaving}
              className="bg-gray-800 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              {pwSaving ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Quick links */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "My Bookings", href: "/bookings", icon: "📋" },
            { label: "My Favorites", href: "/favorites", icon: "❤️" },
          ].map((l) => (
            <button
              key={l.href}
              onClick={() => router.push(l.href)}
              className="bg-white rounded-xl border shadow-sm p-4 text-left hover:shadow-md transition-shadow"
            >
              <span className="text-xl">{l.icon}</span>
              <p className="text-xs font-bold text-gray-700 mt-1">{l.label}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
