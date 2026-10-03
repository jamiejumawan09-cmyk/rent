import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/landlord/bookings?email=x  — all bookings on this landlord's properties
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  // Get landlord's property IDs first
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("landlord_email", email);

  if (!properties?.length) return NextResponse.json([]);

  const propertyIds = properties.map((p) => p.id);

  const { data, error } = await supabase
    .from("bookings")
    .select("*, properties(id, title, location, price, images)")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH — landlord approves or rejects a booking
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, status, landlord_email } = await req.json();

  // Verify this booking belongs to landlord's property
  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id, properties(landlord_email)")
    .eq("id", id)
    .single();

  const propertyLandlord = (booking?.properties as { landlord_email?: string } | null)?.landlord_email;
  if (!booking || propertyLandlord !== landlord_email)
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  const { data, error } = await supabase
    .from("bookings").update({ status }).eq("id", id).select("*, properties(title)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify tenant
  if (status === "Approved" || status === "Rejected") {
    const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";
    const msg = status === "Approved"
      ? `✅ Your booking for "${title}" has been approved by the landlord!`
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
