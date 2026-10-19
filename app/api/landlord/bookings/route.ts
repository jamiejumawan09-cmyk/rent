import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/landlord/bookings?email=x
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

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

  if (!id || !status || !landlord_email)
    return NextResponse.json({ error: "id, status, and landlord_email required." }, { status: 400 });

  if (!["Approved", "Rejected"].includes(status))
    return NextResponse.json({ error: "Landlords can only Approve or Reject bookings." }, { status: 400 });

  // ── Security: verify booking belongs to this landlord's property ──
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_email, user_name, status, property_id, properties(title, landlord_email)")
    .eq("id", id)
    .single();

  if (fetchError || !booking)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const propertyLandlord =
    (booking.properties as { landlord_email?: string } | null)?.landlord_email;

  if (propertyLandlord !== landlord_email)
    return NextResponse.json({ error: "Unauthorized — this booking does not belong to your property." }, { status: 403 });

  if (booking.status !== "Pending")
    return NextResponse.json({ error: `Cannot ${status.toLowerCase()} a booking that is already ${booking.status}.` }, { status: 400 });

  // ── Apply the status change ──────────────────────────────
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("*, properties(title)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";

  if (status === "Approved") {
    // ── Mark property as Booked ──────────────────────────
    await supabase
      .from("properties")
      .update({ status: "Booked" })
      .eq("id", booking.property_id);

    // ── Auto-reject all other Pending bookings on this property ──
    const { data: others } = await supabase
      .from("bookings")
      .select("id, user_email")
      .eq("property_id", booking.property_id)
      .eq("status", "Pending")
      .neq("id", id);

    if (others?.length) {
      const otherIds = others.map((o) => o.id);

      await supabase
        .from("bookings")
        .update({ status: "Rejected" })
        .in("id", otherIds);

      // Notify each auto-rejected tenant
      await supabase.from("notifications").insert(
        others.map((o) => ({
          user_email: o.user_email,
          message: `Your booking for "${title}" was not approved — another tenant was selected.`,
          type: "error",
          is_read: false,
        }))
      );
    }

    // ── Notify the approved tenant ───────────────────────
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: `✅ Your booking for "${title}" has been approved! The landlord will contact you soon.`,
      type: "success",
      is_read: false,
    });
  }

  if (status === "Rejected") {
    // ── Notify the rejected tenant ───────────────────────
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: `❌ Your booking for "${title}" was not approved. You may apply for another property.`,
      type: "error",
      is_read: false,
    });
  }

  return NextResponse.json(data);
}
