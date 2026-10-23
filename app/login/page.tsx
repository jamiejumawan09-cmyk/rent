"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, setSession, clearSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [heroStats, setHeroStats] = useState<{ listings: number; tenants: number; avgRating: string | null } | null>(null);

  useEffect(() => {
    if (getSession()) router.replace("/home");
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setHeroStats({ listings: d.properties ?? 0, tenants: d.tenants ?? 0, avgRating: d.avgRating }))
      .catch(() => {});
  }, [router]);

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setServerError(data.error); return; }

    // Always clear old session before starting a new one
    clearSession();

    if (data.verified) {
      setSession({ email: form.email, name: data.name, role: "admin" });
      router.push("/admin");
    } else {
      sessionStorage.setItem("login_email", form.email);
      sessionStorage.setItem("login_name", data.name);
      sessionStorage.setItem("login_role", data.role ?? "user");
      router.push("/verify-otp?type=login");
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Hero image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/pic.jpg"
          alt="House"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            <span className="text-2xl font-extrabold text-white tracking-tight">
              HOME<span className="text-lime-400 italic">Rent</span>
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Find your perfect<br />home today
          </h1>
          <p className="text-gray-300 text-sm max-w-sm leading-relaxed">
            Browse hundreds of verified rental properties across the Philippines. Safe, affordable, and comfortable.
          </p>
          <div className="flex gap-6 mt-8">
            {[
              { value: heroStats ? `${heroStats.listings}+` : "—", label: "Listings" },
              { value: heroStats ? `${heroStats.tenants}+` : "—", label: "Tenants" },
              { value: heroStats ? (heroStats.avgRating ? `${heroStats.avgRating}★` : "N/A") : "—", label: "Rating" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-xl font-extrabold text-white ${!heroStats ? "animate-pulse text-white/30" : ""}`}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* Logo (mobile only) */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              HOME<span className="text-lime-500 italic">Rent</span>
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 ${errors.email ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
              />
              {errors.email && <p className="text-lime-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-lime-500 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`w-full border rounded-lg px-4 py-3 pr-11 text-sm outline-none transition focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 ${errors.password ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-lime-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors text-sm tracking-wide"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-lime-500 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
