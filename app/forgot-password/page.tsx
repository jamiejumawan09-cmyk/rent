"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const OTP_LENGTH = 6;
const OTP_EXPIRY = 120;
type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [timer, setTimer] = useState(OTP_EXPIRY);
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email."); return; }
    setEmailError(""); setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_otp", email }),
    });
    const data = await res.json();
    setLoading(false);
    setStep("otp");
  }

  function handleOtpChange(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) { setOtp(pasted.split("")); inputs.current[OTP_LENGTH - 1]?.focus(); }
  }

  async function handleResend() {
    setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); setLoading(true);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "forgot_password" }),
    });
    const data = await res.json();
    setLoading(false);
    setTimer(OTP_EXPIRY);
    setOtpSuccess("OTP resent!"); setTimeout(() => setOtpSuccess(""), 3000);
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.join("").length < OTP_LENGTH) { setOtpError("Enter the complete 6-digit OTP."); return; }
    if (timer <= 0) { setOtpError("OTP expired. Please resend."); return; }
    setLoading(true); setOtpError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_otp", email, otp: otp.join("") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setOtpError(data.error); return; }
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
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_password", email, password: passwords.password }),
    });
    setLoading(false);
    if (!res.ok) return;
    setStep("done");
  }

  const mins = String(Math.floor(timer / 60)).padStart(2, "0");
  const secs = String(timer % 60).padStart(2, "0");
  const stepLabels: Step[] = ["email", "otp", "password", "done"];
  const stepIdx = stepLabels.indexOf(step);

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

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {["Email", "OTP", "Password", "Done"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i <= stepIdx ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              {i < 3 && <div className={`w-6 h-0.5 ${i < stepIdx ? "bg-gray-800" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-center mb-1">Forgot Password</h2>
            <p className="text-xs text-gray-500 text-center mb-2">Enter your registered email to receive an OTP.</p>
            <label className="text-xs font-semibold">Email address</label>
            <input
              className={`border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-400 ${emailError ? "border-red-400" : ""}`}
              placeholder="Enter your email" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <p className="text-red-500 text-[10px]">{emailError}</p>}
            <button disabled={loading} className="mt-1 bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60">
              {loading ? "Sending OTP..." : "SEND OTP"}
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit}>
            <h2 className="text-sm font-bold text-center mb-1">Enter OTP</h2>
            <p className="text-xs text-gray-500 text-center mb-3">OTP sent to <span className="font-semibold text-gray-700">{email}</span></p>
            <div className="flex justify-center gap-2 mb-3" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input key={i} ref={(el) => { inputs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  className="w-10 h-10 text-center text-sm font-bold border-2 rounded outline-none focus:border-gray-800"
                />
              ))}
            </div>
            {otpError && <p className="text-red-500 text-[10px] text-center mb-2">{otpError}</p>}
            {otpSuccess && <p className="text-green-600 text-[10px] text-center mb-2">{otpSuccess}</p>}
            <div className="text-center mb-3">
              {timer > 0
                ? <p className="text-xs text-gray-500">Expires in <span className={`font-bold ${timer <= 30 ? "text-red-500" : ""}`}>{mins}:{secs}</span></p>
                : <p className="text-xs text-red-500 font-semibold">OTP expired</p>}
            </div>
            <button disabled={loading || timer <= 0} className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded hover:bg-gray-700 disabled:opacity-60">
              {loading ? "Verifying..." : "VERIFY OTP"}
            </button>
            <div className="text-center mt-2">
              <button type="button" onClick={handleResend} disabled={timer > 0 || loading} className="text-xs text-blue-600 hover:underline disabled:text-gray-400">
                Resend OTP {timer > 0 && `(${mins}:${secs})`}
              </button>
            </div>
          </form>
        )}

        {/* Step 3 */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-center mb-1">New Password</h2>
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

        {/* Step 4 */}
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
