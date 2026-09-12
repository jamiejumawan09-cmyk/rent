"use client";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSession, setSession } from "@/lib/session";

const OTP_LENGTH = 6;
const OTP_EXPIRY = 120;

function VerifyOtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type") ?? "register";

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(OTP_EXPIRY);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If already logged in, go straight to home
    if (getSession()) { router.replace("/home"); return; }
    const key = type === "login" ? "login_email" : "reg_email";
    setEmail(sessionStorage.getItem(key) ?? "");
  }, [type, router]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleChange(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) { setOtp(pasted.split("")); inputs.current[OTP_LENGTH - 1]?.focus(); }
  }

  async function handleResend() {
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }

    setTimer(OTP_EXPIRY);
    setSuccess("OTP resent successfully!");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError("Please enter the complete 6-digit OTP."); return; }
    if (timer <= 0) { setError("OTP has expired. Please resend."); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code, type }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }

    // Save session so home page knows user is logged in
    const name = type === "login"
      ? (sessionStorage.getItem("login_name") ?? "")
      : (sessionStorage.getItem("reg_name") ?? "");
    setSession({ email, name });
    sessionStorage.removeItem("reg_name");
    sessionStorage.removeItem("login_name");
    router.push("/home");
  }

  const mins = String(Math.floor(timer / 60)).padStart(2, "0");
  const secs = String(timer % 60).padStart(2, "0");

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

        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold">Verify your email</h2>
          <p className="text-xs text-gray-500 mt-1">
            We sent a 6-digit OTP to <span className="font-semibold text-gray-700">{email || "your email"}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-3" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-10 h-10 text-center text-sm font-bold border-2 rounded outline-none focus:border-gray-800 transition-colors"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-[10px] text-center mb-2">{error}</p>}
          {success && <p className="text-green-600 text-[10px] text-center mb-2">{success}</p>}

          <div className="text-center mb-3">
            {timer > 0
              ? <p className="text-xs text-gray-500">Expires in <span className={`font-bold ${timer <= 30 ? "text-red-500" : "text-gray-700"}`}>{mins}:{secs}</span></p>
              : <p className="text-xs text-red-500 font-semibold">OTP expired</p>}
          </div>

          <button
            type="submit"
            disabled={loading || timer <= 0}
            className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "VERIFY OTP"}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            onClick={handleResend}
            disabled={timer > 0 || loading}
            className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
          >
            Resend OTP {timer > 0 && `(${mins}:${secs})`}
          </button>
        </div>

        <p className="text-center text-xs mt-3">
          <Link href={type === "login" ? "/login" : "/"} className="text-gray-500 hover:underline">← Back</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
