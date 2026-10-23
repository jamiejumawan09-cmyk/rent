"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { getSession } from "@/lib/session";
import NavLink from "./NavLink";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";

// Center nav
const centerLinks = [
  { href: "/home",    label: "Home" },
  { href: "/houses",  label: "Houses" },
  { href: "/map",     label: "Map" },
  { href: "/compare", label: "Compare" },
  { href: "/about",   label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();

  const [userName,    setUserName]    = useState<string | null>(null);
  const [userEmail,   setUserEmail]   = useState<string | null>(null);
  const [userAvatar,  setUserAvatar]  = useState<string | null>(null);
  const [menuOpen,    setMenuOpen]    = useState(false);

  // Re-sync session on every route change
  useEffect(() => {
    const s = getSession();
    if (s) {
      setUserName(s.name || s.email);
      setUserEmail(s.email);
      setUserAvatar(s.avatar_url ?? null);
    } else {
      setUserName(null);
      setUserEmail(null);
      setUserAvatar(null);
    }
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-green-200 bg-[#edf7ee]/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="HOMERent logo"
            className="h-11 w-11 rounded-full object-cover"
          />
          <span className="text-xl font-extrabold tracking-tight leading-none text-[#244b30]">
            HOME
            <span className="text-[#387a4b] italic">Rent</span>
          </span>
        </Link>

        {/* ── Center: Nav (desktop) ── */}
        <nav className="hidden md:flex items-center gap-2">
          {centerLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        {/* ── Right: Actions (desktop) ── */}
        <div className="hidden md:flex items-center gap-3">
          {userName && userEmail ? (
            <>
              {/* Favorites shortcut */}
              <Link
                href="/favorites"
                aria-label="Favorites"
                className="p-2 rounded-lg text-[#387a4b] hover:bg-green-100 hover:text-[#244b30] transition-colors"
               >
                <Heart className="w-6 h-6" />
              </Link>

              {/* Notification bell — live, only for logged-in users */}
              <NotificationBell userEmail={userEmail} />

              {/* User dropdown */}
              <UserMenu userName={userName} avatarUrl={userAvatar} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#315f40] hover:bg-green-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 rounded-lg text-sm font-medium text-[#387a4b] bg-white hover:bg-green-100 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* ── Hamburger (mobile) ── */}
        <button
          className="md:hidden p-2 rounded-lg text-[#315f40] hover:bg-green-100 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen
            ? <X className="w-6 h-6" />
            : <Menu className="w-6 h-6" />}
        </button>

        {/* ── Mobile: bell shown inline next to hamburger ── */}
        {userEmail && (
          <div className="md:hidden">
            <NotificationBell userEmail={userEmail} />
          </div>
        )}
      </div>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <MobileMenu userName={userName} onClose={() => setMenuOpen(false)} />
      )}
    </header>
  );
}
