import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOtpEmail } from "@/lib/mailer";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("userss")
    .select("id, name, password_hash, is_verified, role")
    .eq("email", email)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash ?? "");
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const otp = generateOtp();
  const otp_expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  await supabase.from("userss").update({ otp, otp_expires }).eq("email", email);

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json({ error: "Failed to send verification email. Check your Gmail credentials." }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP sent. Please verify.", name: user.name, role: user.role, verified: false });
}
