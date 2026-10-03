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
  const { property_id, user_email, user_name, move_in_date, message, payment_method } = await req.json();

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
    property_id, user_email, user_name, move_in_date, message,
    payment_method: payment_method ?? "Cash",
    status: "Pending",
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
    .select("*, properties(title)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire notification for Approved / Rejected
  if (status === "Approved" || status === "Rejected") {
    const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";
    const msg = status === "Approved"
      ? `✅ Your booking for "${title}" has been approved!`
      : `❌ Your booking for "${title}" was not approved.`;
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: msg,
      type: status === "Approved" ? "success" : "error",
      is_read: false,
    });
  }

  return NextResponse.json(data);
}
