"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  label: string;
  onClick?: () => void;
}

export default function NavLink({ href, label, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-base font-bold transition-colors ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
