"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email."); return; }
    setEmailError(""); setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_email", email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setEmailError(data.error); return; }
    setStep("password");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (passwords.password.length < 8) errs.password = "At least 8 characters.";
    else if (!/[A-Z]/.test(passwords.password)) errs.password = "Must contain an uppercase letter.";
    else if (!/[0-9]/.test(passwords.password)) errs.password = "Must contain a number.";
    if (passwords.password !== passwords.confirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) { setPassErrors(errs); return; }
    setLoading(true); setServerError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_password", email, password: passwords.password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setServerError(data.error); return; }
    setStep("done");
  }

  const strength = (() => {
    const p = passwords.password; if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white w-80 rounded-lg shadow-md p-5">
        <div className="flex justify-center mb-1">
          <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="rounded-full" />
        </div>
        <div className="flex justify-center mb-4">
          <span className="text-2xl font-bold">HOME</span>
          <span className="text-2xl font-bold text-red-500">R</span>
          <span className="text-2xl italic text-red-500">ent</span>
        </div>

        {/* Step 1 - Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-center mb-1">Forgot Password</h2>
            <p className="text-xs text-gray-500 text-center mb-2">Enter your registered email to reset your password.</p>
            <label className="text-xs font-semibold">Email address</label>
            <input
              className={`border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-400 ${emailError ? "border-red-400" : ""}`}
              placeholder="Enter your email" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <p className="text-red-500 text-[10px]">{emailError}</p>}
            <button disabled={loading} className="mt-1 bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60">
              {loading ? "Checking..." : "CONTINUE"}
            </button>
          </form>
        )}

        {/* Step 2 - New Password */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-center mb-1">New Password</h2>
            <p className="text-xs text-gray-500 text-center mb-2">Set a new password for <span className="font-semibold text-gray-700">{email}</span></p>
            {serverError && <p className="text-red-500 text-[10px] text-center">{serverError}</p>}
            <div>
              <label className="text-xs font-semibold">New password</label>
              <input
                className={`w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 ${passErrors.password ? "border-red-400" : ""}`}
                placeholder="Enter new password" type="password"
                value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
              />
              {passwords.password && (
                <div className="mt-1">
                  <div className="flex gap-1">{[1,2,3,4].map((i) => <div key={i} className={`h-1 flex-1 rounded ${i <= strength ? strengthColor : "bg-gray-200"}`} />)}</div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{strengthLabel}</p>
                </div>
              )}
              {passErrors.password && <p className="text-red-500 text-[10px] mt-0.5">{passErrors.password}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold">Confirm password</label>
              <input
                className={`w-full border rounded px-2 py-1.5 text-xs mt-0.5 outline-none focus:ring-1 focus:ring-gray-400 ${passErrors.confirm ? "border-red-400" : ""}`}
                placeholder="Confirm new password" type="password"
                value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
              {passErrors.confirm && <p className="text-red-500 text-[10px] mt-0.5">{passErrors.confirm}</p>}
            </div>
            <button disabled={loading} className="mt-1 bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60">
              {loading ? "Updating..." : "UPDATE PASSWORD"}
            </button>
          </form>
        )}

        {/* Step 3 - Done */}
        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-sm font-bold mb-1">Password Updated!</h2>
            <p className="text-xs text-gray-500 mb-4">Your password has been successfully updated.</p>
            <button onClick={() => router.push("/login")} className="bg-gray-800 text-white text-xs font-bold px-6 py-2 rounded hover:bg-gray-700">
              GO TO LOGIN
            </button>
          </div>
        )}

        {step !== "done" && (
          <p className="text-center text-xs mt-3">
            <Link href="/login" className="text-gray-500 hover:underline">← Back to Login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
