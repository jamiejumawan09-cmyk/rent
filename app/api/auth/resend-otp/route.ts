import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, type } = await req.json();
  const supabase = getSupabase();

  if (type === "register") {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP resent." });
}
