import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check if email already exists in our users table
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 400 });
  }

  // Supabase Auth signUp — sends OTP email automatically
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: undefined },
  });

  // Also send OTP explicitly so user gets a code not a link
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Store extra user info in our users table
  if (data.user) {
    await supabaseAdmin.from("users").insert({
      id: data.user.id,
      name,
      email,
      role: "user",
      is_verified: false,
    });
  }

  return NextResponse.json({ message: "OTP sent to your email." });
}
