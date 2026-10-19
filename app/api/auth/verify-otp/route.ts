import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("userss")
    .select("id, name, otp, otp_expires, is_verified, role, avatar_url")
    .eq("email", email)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.otp || user.otp !== otp) {
    return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
  }

  if (!user.otp_expires || new Date() > new Date(user.otp_expires)) {
    return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  }

  // Clear OTP and mark verified
  await supabase
    .from("userss")
    .update({ otp: null, otp_expires: null, is_verified: true })
    .eq("email", email);

  return NextResponse.json({ message: "Verified successfully.", name: user.name, role: user.role, avatar_url: user.avatar_url ?? null });
}
