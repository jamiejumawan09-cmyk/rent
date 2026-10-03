import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("userss")
    .select("id, name, email, role, is_verified, created_at, is_banned")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — admin updates a user's role or ban status
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, role, is_banned } = await req.json();

  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  if (typeof is_banned === "boolean") {
    const { data, error } = await supabase
      .from("userss")
      .update({ is_banned })
      .eq("id", id)
      .select("id, name, email, role, is_verified, created_at, is_banned")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (!role || !["admin", "landlord", "user"].includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const { data, error } = await supabase
    .from("userss")
    .update({ role })
    .eq("id", id)
    .select("id, name, email, role, is_verified, created_at, is_banned")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
