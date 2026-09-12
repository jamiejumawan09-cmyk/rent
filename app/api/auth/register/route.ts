import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  const supabaseAdmin = getSupabaseAdmin();
  const supabase = getSupabase();

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: undefined },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

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
