"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/home");
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

    sessionStorage.setItem("login_email", form.email);
    if (data.name) sessionStorage.setItem("login_name", data.name);

    router.push("/verify-otp?type=login");
  }

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
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-[10px] mt-0.5">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between text-xs mt-1">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60"
          >
            {loading ? "Checking..." : "LOGIN"}
          </button>
        </form>

        <p className="text-center text-xs mt-3">
          Don&apos;t have an account?{" "}
          <Link href="/" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
