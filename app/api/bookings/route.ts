import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  let query = supabase
    .from("bookings")
    .select("*, properties(title, location, price, images)")
    .order("created_at", { ascending: false });

  if (email) query = query.eq("user_email", email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { property_id, user_email, user_name, move_in_date, message } = await req.json();

  if (!property_id || !user_email || !move_in_date)
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", property_id)
    .eq("user_email", user_email)
    .in("status", ["Pending", "Approved"])
    .single();

  if (existing)
    return NextResponse.json({ error: "You already have an active booking for this property." }, { status: 400 });

  const { data, error } = await supabase.from("bookings").insert({
    property_id, user_email, user_name, move_in_date, message, status: "Pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, status } = await req.json();

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
