"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

const contactInfo = [
  { icon: "📍", title: "Address",      lines: ["Unit 4B, Ayala Business Center", "Cebu City, Cebu 6000", "Philippines"] },
  { icon: "📞", title: "Phone",        lines: ["+63 912 345 6789", "+63 32 888 0000"] },
  { icon: "✉️", title: "Email",        lines: ["info@homerent.ph", "support@homerent.ph"] },
  { icon: "🕐", title: "Office Hours", lines: ["Mon – Fri: 8:00 AM – 6:00 PM", "Sat: 9:00 AM – 3:00 PM", "Sun: Closed"] },
];

const faqs = [
  { q: "How do I book a property?",      a: "Browse available properties, click 'View Details', fill in your move-in date and a message, then click 'Submit Booking Request'. The landlord will review and respond." },
  { q: "How long does approval take?",   a: "Most booking requests are reviewed within 24–48 hours. You'll see the status update in your My Bookings page." },
  { q: "Can I cancel a booking?",        a: "Yes — you can cancel any Pending or Approved booking directly from your My Bookings page, as long as move-in has not been confirmed." },
  { q: "Is it free to list a property?", a: "Yes, listing is currently free. Landlords can register and submit their listings for admin approval." },
];

export default function ContactPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Auto-fill name and email from session
  useEffect(() => {
    const s = getSession();
    if (s) {
      setForm((f) => ({
        ...f,
        name:  f.name  || s.name  || "",
        email: f.email || s.email || "",
      }));
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setError("Please fill in all required fields."); return; }
    setSending(true); setError("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) { setError(data.error ?? "Failed to send message. Please try again."); return; }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#387a4b]">

      {/* Hero */}
      <section className="bg-[#3c754b] border-b border-white/10 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-2">Get in touch</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Contact Us</h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Have a question, concern, or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-10">

        {/* ── Contact form ── */}
        <div>
          <h2 className="text-lg font-extrabold text-white mb-5">Send us a message</h2>
          {sent ? (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-bold text-green-200">Message sent!</p>
              <p className="text-xs text-green-300/70 mt-1">
                Thank you for reaching out. We&apos;ll get back to you within 1–2 business days.
              </p>
              <button
                onClick={() => { setSent(false); setForm((f) => ({ ...f, subject: "", message: "" })); }}
                className="mt-4 text-xs text-green-300 underline hover:no-underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/10 border border-white/20 rounded-xl p-6 flex flex-col gap-4">
              {error && (
                <p className="text-lime-300 text-xs bg-lime-500/20 border border-lime-400/30 rounded px-3 py-2">{error}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/80">Full Name *</label>
                  <input
                    className="w-full border border-white/20 rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white placeholder-white/30"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/80">Email Address *</label>
                  <input
                    type="email"
                    className="w-full border border-white/20 rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white placeholder-white/30"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80">Subject</label>
                <input
                  className="w-full border border-white/20 rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white placeholder-white/30"
                  placeholder="What is this about?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80">Message *</label>
                <textarea
                  rows={5}
                  className="w-full border border-white/20 rounded-lg px-3 py-2 text-sm mt-0.5 outline-none focus:ring-1 focus:ring-white/40 resize-none bg-white/10 text-white placeholder-white/30"
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="bg-white text-[#387a4b] text-sm font-extrabold py-2.5 rounded-lg hover:bg-green-100 disabled:opacity-60 transition-colors"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}

          <button
            onClick={() => router.push("/houses")}
            className="mt-6 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to Houses
          </button>
        </div>

        {/* ── Contact info + FAQ ── */}
        <div className="flex flex-col gap-6">

          {/* Info cards */}
          <div>
            <h2 className="text-lg font-extrabold text-white mb-5">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactInfo.map((c) => (
                <div key={c.title} className="bg-white/10 border border-white/20 rounded-xl p-4">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className="text-xs font-bold text-white mb-1">{c.title}</p>
                  {c.lines.map((l) => (
                    <p key={l} className="text-xs text-white/60 leading-relaxed">{l}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-base font-extrabold text-white mb-4">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-2">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 border-t border-white/10">
                      <p className="text-xs text-white/60 leading-relaxed pt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
