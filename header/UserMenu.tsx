"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, BookMarked, Heart, MessageCircle, LogOut } from "lucide-react";
import { clearSession } from "@/lib/session";

interface UserMenuProps {
  userName: string;
  avatarUrl?: string | null;
}

export default function UserMenu({ userName, avatarUrl }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleLogout() {
    clearSession();
    setOpen(false);
    router.push("/login");
  }

  const initial = userName.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-green-200 bg-white/70 hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {/* Avatar */}
        <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-[#315f40] text-sm font-bold shrink-0 overflow-hidden">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={userName} width={36} height={36} className="object-cover w-full h-full" />
          ) : (
            initial
          )}
        </span>
        <span className="text-sm font-semibold text-[#244b30] max-w-[120px] truncate hidden sm:block">
          {userName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5b8064] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          {/* User info header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                initial
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{userName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Signed in</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/bookings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BookMarked className="w-4 h-4 text-gray-400" />
              My Bookings
            </Link>
            <Link
              href="/favorites"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Heart className="w-4 h-4 text-gray-400" />
              Favorites
            </Link>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-gray-400" />
              Messages
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs font-bold">
                {initial}
              </span>
              My Profile
            </Link>
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-lime-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
