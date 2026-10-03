"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const session = getSession();
    if (session) {
      if (session.email === "admin@homerent.ph" || session.role === "admin") {
        router.replace("/admin");
      } else if (session.role === "landlord") {
        router.replace("/landlord");
      } else {
        router.replace("/home");
      }
    } else {
      router.replace("/home");
    }
  }, [router]);
  return null;
}
