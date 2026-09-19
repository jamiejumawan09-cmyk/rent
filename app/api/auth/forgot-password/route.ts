import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const supabaseAdmin = getSupabaseAdmin();

  if (action === "check_email") {
    const { email } = body;
    const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).single();
    if (!user) return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
    return NextResponse.json({ message: "Email found." });
  }

  if (action === "update_password") {
    const { email, password } = body;
    const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).single();
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const password_hash = await bcrypt.hash(password, 12);
    await supabaseAdmin.from("users").update({ password_hash }).eq("id", user.id);
    return NextResponse.json({ message: "Password updated successfully." });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
