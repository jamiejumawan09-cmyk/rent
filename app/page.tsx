"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(session.email === "admin@homerent.ph" ? "/admin" : "/home");
    } else {
      router.replace("/home");
    }
  }, [router]);
  return null;
}
