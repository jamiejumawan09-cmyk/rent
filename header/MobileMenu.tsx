"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookMarked, Heart, LogOut, Home, Building2, Map, SlidersHorizontal, Info, Mail } from "lucide-react";
import { clearSession } from "@/lib/session";
import NavLink from "./NavLink";

interface MobileMenuProps {
  userName: string | null;
  onClose: () => void;
}

const mainLinks = [
  { href: "/home",    label: "Home",    icon: Home },
  { href: "/houses",  label: "Houses",  icon: Building2 },
  { href: "/map",     label: "Map",     icon: Map },
  { href: "/compare", label: "Compare", icon: SlidersHorizontal },
];

const moreLinks = [
  { href: "/about",   label: "About",   icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
];

const authLinks = [
  { href: "/bookings",  label: "My Bookings", icon: BookMarked },
  { href: "/favorites", label: "Favorites",   icon: Heart },
];

export default function MobileMenu({ userName, onClose }: MobileMenuProps) {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    onClose();
    router.push("/login");
  }

  return (
    <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex flex-col gap-0.5">

      {/* Main nav */}
      {mainLinks.map(({ href, label, icon: Icon }) => (
        <div key={href} className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
          <NavLink href={href} label={label} onClick={onClose} />
        </div>
      ))}

      {/* More links */}
      <div className="border-t border-gray-100 mt-1 pt-1">
        {moreLinks.map(({ href, label, icon: Icon }) => (
          <div key={href} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            <NavLink href={href} label={label} onClick={onClose} />
          </div>
        ))}
      </div>

      {/* Auth-only links */}
      {userName && (
        <div className="border-t border-gray-100 mt-1 pt-1">
          {authLinks.map(({ href, label, icon: Icon }) => (
            <div key={href} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
              <NavLink href={href} label={label} onClick={onClose} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 shrink-0 ml-1 flex items-center justify-center text-gray-400 text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
            <NavLink href="/profile" label="My Profile" onClick={onClose} />
          </div>
        </div>
      )}

      {/* Login / Logout */}
      <div className="border-t border-gray-100 mt-1 pt-2 flex flex-col gap-1">
        {userName ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              onClick={onClose}
              className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
