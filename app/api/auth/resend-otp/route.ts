import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("userss")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Email not found." }, { status: 404 });
  }

  const otp = generateOtp();
  const otp_expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  await supabase.from("userss").update({ otp, otp_expires }).eq("email", email);

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error("Failed to resend OTP:", err);
    return NextResponse.json({ error: "Failed to send email. Check your Gmail credentials." }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP resent successfully." });
}
