"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [show, setShow] = useState({ password: false, confirm: false });

  useEffect(() => {
    if (getSession()) router.replace("/home");
  }, [router]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (form.password.length < 8) e.password = "At least 8 characters.";
    else if (!/[A-Z]/.test(form.password)) e.password = "Must contain an uppercase letter.";
    else if (!/[0-9]/.test(form.password)) e.password = "Must contain a number.";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setServerError(data.error); return; }

    sessionStorage.setItem("reg_email", form.email);
    router.push("/verify-otp?type=register");
  }

  const strength = (() => {
    const p = form.password; if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"][strength];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white w-80 rounded-lg shadow-md p-5">
        <div className="flex justify-center mb-1">
          <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="rounded-full" />
        </div>
        <div className="flex justify-center mb-3">
          <span className="text-2xl font-bold">HOME</span>
          <span className="text-2xl font-bold text-red-500">R</span>
          <span className="text-2xl italic text-red-500">ent</span>
        </div>
        <Image src="/pic.jpg" alt="House" width={320} height={100} className="w-full h-24 object-cover rounded mb-4" loading="eager" />

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded px-3 py-2 mb-3">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <div>
            <label className="text-xs font-semibold">Full name</label>
            <input
              className={`w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 ${errors.name ? "border-red-400" : ""}`}
              placeholder="Enter your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <p className="text-red-500 text-[10px] mt-0.5">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold">Email address</label>
            <input
              className={`w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 ${errors.email ? "border-red-400" : ""}`}
              placeholder="Enter your email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <p className="text-red-500 text-[10px] mt-0.5">{errors.email}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold">Password</label>
            <div className="relative mt-0.5">
              <input
                className={`w-full border rounded px-2 py-1.5 pr-8 text-xs outline-none focus:ring-1 focus:ring-gray-400 ${errors.password ? "border-red-400" : ""}`}
                placeholder="Create a password"
                type={show.password ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, password: !s.password }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show.password ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {form.password && (
              <div className="mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded ${i <= strength ? strengthColor : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{strengthLabel}</p>
              </div>
            )}
            {errors.password && <p className="text-red-500 text-[10px] mt-0.5">{errors.password}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold">Confirm password</label>
            <div className="relative mt-0.5">
              <input
                className={`w-full border rounded px-2 py-1.5 pr-8 text-xs outline-none focus:ring-1 focus:ring-gray-400 ${errors.confirm ? "border-red-400" : ""}`}
                placeholder="Confirm your password"
                type={show.confirm ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show.confirm ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {errors.confirm && <p className="text-red-500 text-[10px] mt-0.5">{errors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60"
          >
            {loading ? "Sending OTP..." : "REGISTER NOW"}
          </button>
        </form>

        <p className="text-center text-xs mt-3">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
