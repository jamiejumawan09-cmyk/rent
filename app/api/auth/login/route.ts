import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, name, password_hash, is_verified")
    .eq("email", email)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.is_verified) {
    return NextResponse.json({ error: "Account not verified. Please complete OTP verification." }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { error: otpError } = await getSupabase().auth.signInWithOtp({ email });
  if (otpError) {
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP sent to your email.", name: user.name });
}
