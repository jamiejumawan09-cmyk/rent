import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, otp, type } = await req.json();
  const supabase = getSupabase();
  const supabaseAdmin = getSupabaseAdmin();

  const tokenType = type === "register" ? "signup" : "email";

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: tokenType,
  });

  if (error) {
    return NextResponse.json({ error: "Incorrect or expired OTP." }, { status: 400 });
  }

  if (data.user) {
    await supabaseAdmin.from("users").update({ is_verified: true }).eq("email", email);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: data.user.id,
      action: type === "register" ? "account_verified" : "login_otp_verified",
    });
  }

  return NextResponse.json({ message: "OTP verified successfully." });
}
