import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const { data, error } = await supabase
    .from("favorites")
    .select("property_id, properties(id, title, location, price, status, description, images, beds, baths, sqm)")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { user_email, property_id } = await req.json();
  if (!user_email || !property_id)
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  // Toggle: remove if exists, add if not
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_email", user_email)
    .eq("property_id", property_id)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase.from("favorites").insert({ user_email, property_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favorited: true });
}
