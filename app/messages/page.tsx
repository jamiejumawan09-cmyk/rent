"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";

type Thread = {
  property_id: string;
  thread_key?: string;
  is_support?: boolean;
  property_title: string;
  property_image: string | null;
  landlord_email: string;
  landlord_name: string;
  last_message: string;
  last_at: string;
  unread: number;
};

type Message = {
  id: string;
  sender_email: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    setSession(s);

    Promise.all([
      fetch(`/api/messages/threads?email=${encodeURIComponent(s.email)}`).then(async (r) => ({ ok: r.ok, data: await r.json() })),
      fetch(`/api/admin/messages?email=${encodeURIComponent(s.email)}`).then(async (r) => ({ ok: r.ok, data: await r.json() })),
    ])
      .then(([propertyResult, directResult]) => {
        if (!propertyResult.ok || !directResult.ok) {
          throw new Error(propertyResult.data?.error || directResult.data?.error || "Could not load your conversations.");
        }
        const propertyThreads = propertyResult.data;
        const directThreads = directResult.data;
        const supportThreads: Thread[] = (Array.isArray(directThreads) ? directThreads : []).map((thread) => ({
          property_id: `support:${thread.thread_key}`,
          thread_key: thread.thread_key,
          is_support: true,
          property_title: "HOMERent Support",
          property_image: null,
          landlord_email: thread.other_email,
          landlord_name: thread.other_name || "Support team",
          last_message: thread.last_message,
          last_at: thread.last_at,
          unread: thread.unread,
        }));
        const allThreads = [
          ...(Array.isArray(propertyThreads) ? propertyThreads : []),
          ...supportThreads,
        ].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
        setThreads(allThreads);
        setLoading(false);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Could not load your conversations.");
        setLoading(false);
      });
  }, [router]);

  async function openThread(t: Thread) {
    setActiveThread(t);
    setMsgLoading(true);
    const s = getSession();
    if (!s) return;
    const res = await fetch(t.is_support
      ? `/api/admin/messages?email=${encodeURIComponent(s.email)}&with=${encodeURIComponent(t.landlord_email)}`
      : `/api/messages?property_id=${t.property_id}&email=${encodeURIComponent(s.email)}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setMsgLoading(false);
    // Mark thread as read locally
    setThreads((prev) => prev.map((th) => th.property_id === t.property_id ? { ...th, unread: 0 } : th));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeThread || !session) return;
    setSending(true);
    const res = await fetch(activeThread.is_support ? "/api/admin/messages" : "/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activeThread.is_support ? {
        sender_email: session.email,
        sender_name: session.name,
        receiver_email: activeThread.landlord_email,
        content: newMsg.trim(),
      } : {
        property_id: activeThread.property_id,
        sender_email: session.email,
        sender_name: session.name,
        receiver_email: activeThread.landlord_email,
        content: newMsg.trim(),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setMessages((prev) => [...prev, data]);
      setNewMsg("");
      // Update thread last message
      setThreads((prev) => prev.map((t) =>
        t.property_id === activeThread.property_id
          ? { ...t, last_message: data.content, last_at: data.created_at }
          : t
      ));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <main className="min-h-screen bg-[#387a4b]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-white mb-1">Messages</h1>
        <p className="text-white/60 text-sm mb-6">Your conversations with landlords and HOMERent Support</p>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadError}</div>
        ) : threads.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-semibold text-white">No messages yet</p>
            <p className="text-xs text-white/50 mt-1 mb-4">Start a conversation by messaging a landlord on any property page.</p>
            <button
              onClick={() => router.push("/houses")}
              className="bg-white text-[#387a4b] text-xs font-extrabold px-5 py-2 rounded-lg hover:bg-green-100 transition-colors"
            >
              Browse Houses
            </button>
          </div>
        ) : (
          <div className="flex gap-4 h-[600px]">

            {/* ── Thread list ── */}
            <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto rounded-xl p-2 border border-white/20" style={{ backgroundColor: "#3c754b" }}>
              {threads.map((t) => (
                <button
                  key={t.property_id}
                  onClick={() => openThread(t)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    activeThread?.property_id === t.property_id
                      ? "bg-white/25 border-white/40"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {/* Property thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
                    {t.is_support ? (
                      <div className="w-full h-full flex items-center justify-center text-[#387a4b] text-xs font-extrabold">HR</div>
                    ) : t.property_image ? (
                      <Image src={t.property_image} alt={t.property_title} fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">🏠</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{t.property_title}</p>
                    <p className="text-[10px] text-white/60 truncate">{t.landlord_name}</p>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">{t.last_message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-[9px] text-white/40">{timeAgo(t.last_at)}</p>
                    {t.unread > 0 && (
                      <span className="w-4 h-4 bg-lime-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* ── Chat area ── */}
            <div className="flex-1 rounded-xl flex flex-col overflow-hidden border border-white/20" style={{ backgroundColor: "#3c754b" }}>
              {!activeThread ? (
                <div className="flex-1 flex items-center justify-center text-white/40">
                  <div className="text-center">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm">Select a conversation</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#edf7ee] border-b border-green-200">
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0">
                      {activeThread.is_support ? (
                        <div className="w-full h-full flex items-center justify-center text-[#387a4b] text-[10px] font-extrabold">HR</div>
                      ) : activeThread.property_image ? (
                        <Image src={activeThread.property_image} alt={activeThread.property_title} fill sizes="36px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">🏠</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#244b30] truncate">{activeThread.property_title}</p>
                      <p className="text-[10px] text-[#64806a]">{activeThread.is_support ? "HOMERent Support" : `Landlord: ${activeThread.landlord_name}`}</p>
                    </div>
                    {!activeThread.is_support && (
                    <button
                      onClick={() => router.push(`/houses/${activeThread.property_id}`)}
                      className="text-[10px] text-[#315f40] hover:text-[#244b30] border border-green-200 rounded-lg px-2 py-1 hover:bg-green-100 transition-colors"
                    >
                      View Property →
                    </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                    {msgLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-6 h-6 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-white/40 text-xs">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.sender_email === session?.email;
                        return (
                          <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${isMe ? "bg-white text-[#387a4b] font-medium" : "bg-white/20 text-white"}`}>
                              {!isMe && <p className="text-[10px] font-bold mb-0.5 text-white/70">{m.sender_name}</p>}
                              <p>{m.content}</p>
                              <p className={`text-[9px] mt-0.5 ${isMe ? "text-[#387a4b]/50 text-right" : "text-white/40"}`}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSend} className="px-4 py-3 border-t border-white/10 flex gap-2">
                    <input
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/40"
                      placeholder="Type a message..."
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMsg.trim()}
                      className="bg-white text-[#387a4b] text-xs font-extrabold px-4 py-2 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
