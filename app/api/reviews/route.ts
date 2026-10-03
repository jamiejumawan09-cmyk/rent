import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const property_id = new URL(req.url).searchParams.get("property_id");
  if (!property_id) return NextResponse.json({ error: "property_id required." }, { status: 400 });

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("property_id", property_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { property_id, user_email, user_name, rating, comment } = await req.json();

  if (!property_id || !user_email || !rating)
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

  if (rating < 1 || rating > 5)
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });

  // Only allow if the user has an Approved booking for this property
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", property_id)
    .eq("user_email", user_email)
    .eq("status", "Approved")
    .single();

  if (!booking)
    return NextResponse.json({ error: "You can only review properties you have an approved booking for." }, { status: 403 });

  // One review per user per property
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("property_id", property_id)
    .eq("user_email", user_email)
    .single();

  if (existing)
    return NextResponse.json({ error: "You have already reviewed this property." }, { status: 400 });

  const { data, error } = await supabase
    .from("reviews")
    .insert({ property_id, user_email, user_name, rating, comment })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, user_email } = await req.json();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_email", user_email); // ensure only owner can delete

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
