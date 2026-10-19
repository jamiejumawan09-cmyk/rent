import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { name, email, phone, password } = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("userss")
    .select("id, is_verified")
    .eq("email", email)
    .single();

  if (existing?.is_verified) {
    return NextResponse.json({ error: "Email already registered." }, { status: 400 });
  }

  const otp = generateOtp();
  const otp_expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  if (existing) {
    const { error } = await supabase
      .from("userss")
      .update({ name, phone: phone?.trim() || null, password_hash: password, otp, otp_expires, is_verified: false })
      .eq("email", email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("userss").insert({
      name, email, phone: phone?.trim() || null, password_hash: password, role: "user", is_verified: false, otp, otp_expires,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json({ error: "Failed to send verification email. Check your Gmail credentials." }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP sent. Please verify your email." });
}
