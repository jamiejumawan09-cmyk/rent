import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── Helper: notify multiple recipients ──────────────────────────────────────
async function notify(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: { user_email: string; message: string; type: string; link?: string }[]
) {
  if (!rows.length) return;
  await supabase.from("notifications").insert(
    rows.map((r) => ({ ...r, is_read: false }))
  );
}

// ── GET /api/move-out ────────────────────────────────────────────────────────
// ?email=&role=   → tenant sees own, landlord sees their properties, admin sees all
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const role  = searchParams.get("role") ?? "user";

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  let query = supabase
    .from("move_out_requests")
    .select(
      `id, booking_id, tenant_email, tenant_name, property_id, move_out_date,
       reason, status, created_at, acknowledged_by,
       properties(id, title, location, landlord_email, landlord_name, images)`
    )
    .order("move_out_date", { ascending: true });

  if (role === "admin") {
    // admins see everything — no filter
  } else if (role === "landlord") {
    // landlords see requests on their properties
    query = query.eq("properties.landlord_email", email);
  } else {
    // tenants see only their own requests
    query = query.eq("tenant_email", email);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For landlord, the join filter above only marks non-matching rows as null properties;
  // filter those out manually
  const result = role === "landlord"
    ? (data ?? []).filter((r) => r.properties !== null)
    : (data ?? []);

  return NextResponse.json(result);
}

// ── POST /api/move-out ───────────────────────────────────────────────────────
// Tenant submits a move-out request
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { booking_id, tenant_email, tenant_name, move_out_date, reason } =
    await req.json();

  if (!booking_id || !tenant_email || !move_out_date)
    return NextResponse.json(
      { error: "booking_id, tenant_email and move_out_date are required." },
      { status: 400 }
    );

  // Move-out date must be today or later
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(move_out_date) < today)
    return NextResponse.json(
      { error: "Move-out date must be today or a future date." },
      { status: 400 }
    );

  // Verify the booking exists, is Approved, and belongs to this tenant
  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .select("id, user_email, status, property_id, properties(title, landlord_email, landlord_name)")
    .eq("id", booking_id)
    .single();

  if (bookErr || !booking)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (booking.user_email !== tenant_email)
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  if (booking.status !== "Approved")
    return NextResponse.json(
      { error: "Move-out can only be requested for an Approved booking." },
      { status: 400 }
    );

  // Block duplicate active requests for this booking
  const { data: existing } = await supabase
    .from("move_out_requests")
    .select("id")
    .eq("booking_id", booking_id)
    .in("status", ["Pending", "Acknowledged"])
    .maybeSingle();

  if (existing)
    return NextResponse.json(
      { error: "A move-out request for this booking is already active." },
      { status: 400 }
    );

  const bookingProperty = booking.properties as unknown as {
    title: string; landlord_email: string; landlord_name: string;
  } | { title: string; landlord_email: string; landlord_name: string }[] | null;
  const prop = Array.isArray(bookingProperty) ? bookingProperty[0] ?? null : bookingProperty;

  const { data, error } = await supabase
    .from("move_out_requests")
    .insert({
      booking_id,
      tenant_email,
      tenant_name: tenant_name ?? tenant_email,
      property_id: booking.property_id,
      move_out_date,
      reason: reason?.trim() || null,
      status: "Pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the landlord
  const landlordEmail = prop?.landlord_email;
  const propertyTitle = prop?.title ?? "your property";

  const notifs: { user_email: string; message: string; type: string; link: string }[] = [];

  if (landlordEmail) {
    notifs.push({
      user_email: landlordEmail,
      message: `🚪 Tenant "${tenant_name ?? tenant_email}" has submitted a move-out request for "${propertyTitle}" on ${new Date(move_out_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
      type: "info",
      link: "/landlord",
    });
  }

  // Notify all admins
  const { data: admins } = await supabase
    .from("users")
    .select("email")
    .eq("role", "admin");

  (admins ?? []).forEach((a: { email: string }) => {
    if (a.email !== landlordEmail) {
      notifs.push({
        user_email: a.email,
        message: `🚪 Move-out request submitted by "${tenant_name ?? tenant_email}" for "${propertyTitle}" on ${new Date(move_out_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
        type: "info",
        link: "/admin",
      });
    }
  });

  await notify(supabase, notifs);

  return NextResponse.json(data, { status: 201 });
}

// ── PATCH /api/move-out ──────────────────────────────────────────────────────
// Landlord/admin: Acknowledge or Complete. Tenant: Cancel (while Pending).
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, status, actor_email, role, reminder_message } = await req.json();

  if (!id || !actor_email || !role)
    return NextResponse.json({ error: "id, actor_email and role are required." }, { status: 400 });

  // Fetch the request
  const { data: req_data, error: fetchErr } = await supabase
    .from("move_out_requests")
    .select(
      `id, booking_id, tenant_email, tenant_name, property_id, move_out_date, status,
       properties(title, landlord_email)`
    )
    .eq("id", id)
    .single();

  if (fetchErr || !req_data)
    return NextResponse.json({ error: "Move-out request not found." }, { status: 404 });

  const requestProperty = req_data.properties as unknown as
    | { title: string; landlord_email: string }
    | { title: string; landlord_email: string }[]
    | null;
  const prop = Array.isArray(requestProperty) ? requestProperty[0] ?? null : requestProperty;
  const isAdmin    = role === "admin";
  const isLandlord = role === "landlord" && prop?.landlord_email === actor_email;
  const isTenant   = role === "user" && req_data.tenant_email === actor_email;

  // ── Send manual reminder (no status change) ─────────────────────────────
  if (reminder_message) {
    if (!isAdmin && !isLandlord)
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

    await notify(supabase, [{
      user_email: req_data.tenant_email,
      message: `📌 Reminder from your landlord regarding your move-out on ${new Date(req_data.move_out_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: "${reminder_message}"`,
      type: "info",
      link: "/bookings",
    }]);

    return NextResponse.json({ success: true });
  }

  if (!status)
    return NextResponse.json({ error: "status or reminder_message is required." }, { status: 400 });

  // ── Cancel — tenant only, while Pending ─────────────────────────────────
  if (status === "Cancelled") {
    if (!isTenant && !isAdmin)
      return NextResponse.json(
        { error: "Only the tenant or admin can cancel a move-out request." },
        { status: 403 }
      );
    if (req_data.status !== "Pending")
      return NextResponse.json(
        { error: "Only Pending requests can be cancelled." },
        { status: 400 }
      );
  }

  // ── Acknowledge / Complete — landlord or admin only ──────────────────────
  if (status === "Acknowledged" || status === "Completed") {
    if (!isAdmin && !isLandlord)
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const updatePayload: Record<string, unknown> = { status };
  if (status === "Acknowledged" || status === "Completed") {
    updatePayload.acknowledged_by = actor_email;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("move_out_requests")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const title = prop?.title ?? "your property";
  const moveOutFormatted = new Date(req_data.move_out_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // ── On Completed: update booking → Ended, property → Available ──────────
  if (status === "Completed") {
    await supabase
      .from("bookings")
      .update({ status: "Ended" })
      .eq("id", req_data.booking_id);

    await supabase
      .from("properties")
      .update({ status: "Available" })
      .eq("id", req_data.property_id);

    // Notify tenant
    await notify(supabase, [{
      user_email: req_data.tenant_email,
      message: `✅ Your move-out from "${title}" on ${moveOutFormatted} has been marked as completed. Thank you for staying!`,
      type: "success",
      link: "/bookings",
    }]);
  }

  // ── On Acknowledged: notify tenant ───────────────────────────────────────
  if (status === "Acknowledged") {
    await notify(supabase, [{
      user_email: req_data.tenant_email,
      message: `📋 Your move-out request for "${title}" on ${moveOutFormatted} has been acknowledged. The landlord will be in touch.`,
      type: "info",
      link: "/bookings",
    }]);
  }

  // ── On Cancelled (by tenant): notify landlord ────────────────────────────
  if (status === "Cancelled") {
    const notifs: { user_email: string; message: string; type: string; link: string }[] = [];
    if (prop?.landlord_email) {
      notifs.push({
        user_email: prop.landlord_email,
        message: `🔔 Tenant "${req_data.tenant_name}" has cancelled their move-out request for "${title}".`,
        type: "info",
        link: "/landlord",
      });
    }
    await notify(supabase, notifs);
  }

  return NextResponse.json(updated);
}
