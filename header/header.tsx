"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { getSession } from "@/lib/session";
import NavLink from "./NavLink";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";

// Center nav — About & Contact moved to footer
const centerLinks = [
  { href: "/home",    label: "Home" },
  { href: "/houses",  label: "Houses" },
  { href: "/map",     label: "Map" },
  { href: "/compare", label: "Compare" },
];

export default function Header() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [userName, setUserName]   = useState<string | null>(null);
  const [menuOpen, setMenuOpen]   = useState(false);

  // Re-sync session on every route change
  useEffect(() => {
    const s = getSession();
    setUserName(s ? (s.name || s.email) : null);
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="HOMERent logo"
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-base font-extrabold tracking-tight leading-none">
            HOME
            <span className="text-red-500 font-extrabold italic">Rent</span>
          </span>
        </Link>

        {/* ── Center: Nav (desktop) ── */}
        <nav className="hidden md:flex items-center gap-1">
          {centerLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        {/* ── Right: Actions (desktop) ── */}
        <div className="hidden md:flex items-center gap-2">
          {userName ? (
            <>
              {/* Favorites shortcut */}
              <Link
                href="/favorites"
                aria-label="Favorites"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors"
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* User dropdown */}
              <UserMenu userName={userName} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* ── Hamburger (mobile) ── */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen
            ? <X className="w-5 h-5" />
            : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <MobileMenu userName={userName} onClose={() => setMenuOpen(false)} />
      )}
    </header>
  );
}
