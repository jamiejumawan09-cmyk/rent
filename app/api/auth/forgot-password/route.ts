import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const supabase = getSupabase();
  const supabaseAdmin = getSupabaseAdmin();

  if (action === "send_otp") {
    const { email } = body;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "OTP sent." });
  }

  if (action === "verify_otp") {
    const { email, otp } = body;
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) return NextResponse.json({ error: "Incorrect or expired OTP." }, { status: 400 });
    return NextResponse.json({ message: "OTP verified." });
  }

  if (action === "update_password") {
    const { email, password } = body;
    const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).single();
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const password_hash = await bcrypt.hash(password, 12);
    await supabaseAdmin.from("users").update({ password_hash }).eq("id", user.id);
    await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    await supabaseAdmin.from("activity_logs").insert({ user_id: user.id, action: "password_reset" });
    return NextResponse.json({ message: "Password updated successfully." });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
