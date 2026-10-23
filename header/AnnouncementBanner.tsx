"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";

type Announcement = { id: string; message: string; type: string };

// Pages that have their own full-screen layout — skip banner
const SKIP_PAGES = ["/login", "/register", "/forgot-password", "/verify-otp", "/admin", "/landlord"];

export default function AnnouncementBanner() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Don't show on admin/landlord/auth pages
  if (SKIP_PAGES.some((p) => pathname.startsWith(p))) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [pathname]); // re-fetch on route change so new announcements appear

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const styles: Record<string, string> = {
    info:    "bg-blue-600 text-white",
    warning: "bg-yellow-400 text-yellow-900",
    success: "bg-green-600 text-white",
  };

  const icons = {
    info: <Info className="h-4 w-4" />,
    warning: <TriangleAlert className="h-4 w-4" />,
    success: <CircleCheck className="h-4 w-4" />,
  };

  return (
    <div className="flex flex-col w-full">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium ${styles[a.type] ?? styles.info}`}
        >
          <div className="flex items-center gap-2">
            <span>{icons[a.type as keyof typeof icons] ?? <Info className="h-4 w-4" />}</span>
            <span>{a.message}</span>
          </div>
          <button
            onClick={() => setDismissed((p) => [...p, a.id])}
            className="shrink-0 opacity-70 hover:opacity-100 text-lg leading-none"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
