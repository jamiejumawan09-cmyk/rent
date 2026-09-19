"use client";
import { usePathname } from "next/navigation";
import Header from "./header";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/verify-otp", "/admin"];

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) return null;
  return <Header />;
}
