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
          ? "bg-green-100 text-[#244b30]"
          : "text-[#315f40] hover:bg-green-100 hover:text-[#244b30]"
      }`}
    >
      {label}
    </Link>
  );
}
