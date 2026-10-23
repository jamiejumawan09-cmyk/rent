"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Notification = {
  id: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  booking_id: string | null;
};

interface NotificationBellProps {
  userEmail: string;
}

export default function NotificationBell({ userEmail }: NotificationBellProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const dropRef  = useRef<HTMLDivElement>(null);

  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Fetch notifications from API ────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications?email=${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Supabase Realtime subscription ──────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    // Supabase reuses channels by name; callbacks cannot be added after subscribe.
    // A unique name also prevents Strict Mode/HMR from returning an old channel.
    const instanceId = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channelName = `notifications:${userEmail}:${instanceId}`;
    let active = true;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_email=eq.${userEmail}`,
        },
        (payload) => {
          if (!active) return;
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userEmail]);

  // ── Close dropdown on outside click ─────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Close dropdown on Escape ─────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ── Close on route change ────────────────────────────────
  useEffect(() => { setOpen(false); }, [pathname]);

  // ── Mark all as read when dropdown opens ─────────────────
  useEffect(() => {
    if (!open || unreadCount === 0) return;

    // Optimistically update local state
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );

    // Persist to DB
    fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: userEmail }),
    }).catch(() => {});
  }, [open, userEmail, unreadCount]);

  // ── Navigate and close ────────────────────────────────────
  function handleNotifClick(notif: Notification) {
    setOpen(false);
    // If link already has booking_id param, use as-is
    if (notif.link) {
      // Append booking_id highlight param if we have one
      if (notif.booking_id && !notif.link.includes("highlight=")) {
        router.push(`${notif.link}?highlight=${notif.booking_id}`);
      } else {
        router.push(notif.link);
      }
      return;
    }
    // Fallback from message content
    const msg = notif.message.toLowerCase();
    if (notif.booking_id) {
      router.push(`/bookings?highlight=${notif.booking_id}`);
    } else if (msg.includes("refund") || msg.includes("receipt") || msg.includes("payment") || msg.includes("move")) {
      router.push("/bookings");
    } else {
      router.push("/bookings");
    }
  }

  // ── Delete a notification ─────────────────────────────────
  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/notifications", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, email: userEmail }),
      });
    } catch {
      // silently ignore
    }
  }

  function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div ref={dropRef} className="relative">

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-2 rounded-lg text-[#387a4b] hover:bg-green-100 hover:text-[#244b30] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <Bell className="w-6 h-6" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-lime-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-extrabold text-gray-800">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={() => setNotifications([])}
                className="text-[11px] text-gray-400 hover:text-lime-500 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                      <div className="h-2 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group ${!n.is_read ? "bg-blue-50/40" : ""}`}
                >
                  {/* Unread dot */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${!n.is_read ? "bg-lime-500" : "bg-transparent"}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${!n.is_read ? "text-gray-800 font-semibold" : "text-gray-600"}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    className="text-gray-300 hover:text-lime-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                    aria-label="Delete notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                onClick={() => { setOpen(false); router.push("/bookings"); }}
                className="text-xs text-lime-500 font-semibold hover:underline"
              >
                View all bookings →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
