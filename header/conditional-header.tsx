"use client";
import { usePathname } from "next/navigation";
import Header from "./header";

// Pages that have their own full-screen layout — no shared header needed
const NO_HEADER_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-otp",
  "/admin",
  "/landlord",
];

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (NO_HEADER_PAGES.some((p) => pathname.startsWith(p))) return null;
  return <Header />;
}
