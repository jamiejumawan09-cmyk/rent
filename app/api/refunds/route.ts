import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── GET /api/refunds ──────────────────────────────────────────────────────────
// ?email=&role=   → tenant: own, landlord: their properties, admin: all
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const role  = searchParams.get("role") ?? "user";

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // For landlord, resolve their property IDs first
  if (role === "landlord") {
    const { data: props } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_email", email);

    const propIds = (props ?? []).map((p: { id: string }) => p.id);
    if (!propIds.length) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("refund_requests")
      .select(
        `id, booking_id, tenant_email, tenant_name, property_id,
         payment_method, reason, status, landlord_note, refund_proof_url,
         created_at, resolved_at,
         properties(id, title, landlord_email, landlord_name)`
      )
      .in("property_id", propIds)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Admin — all refunds
  // Tenant — own refunds only
  let query = supabase
    .from("refund_requests")
    .select(
      `id, booking_id, tenant_email, tenant_name, property_id,
       payment_method, reason, status, landlord_note, refund_proof_url,
       created_at, resolved_at,
       properties(id, title, landlord_email, landlord_name)`
    )
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    query = query.eq("tenant_email", email);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST /api/refunds ─────────────────────────────────────────────────────────
// Tenant requests a refund when cancelling an Approved + confirmed-payment booking
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { booking_id, tenant_email, reason } = await req.json();

  if (!booking_id || !tenant_email)
    return NextResponse.json({ error: "booking_id and tenant_email are required." }, { status: 400 });

  // Verify booking: must be Approved, belong to this tenant, and have a confirmed payment
  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .select("id, user_email, status, property_id, payment_method, payment_confirmed, payment_receipt_url, user_name, properties(title, landlord_email, landlord_name)")
    .eq("id", booking_id)
    .single();

  if (bookErr || !booking)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (booking.user_email !== tenant_email)
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  // Booking must be Cancelled (was Approved) or still Approved
  if (!["Approved", "Cancelled"].includes(booking.status))
    return NextResponse.json({ error: "Refunds can only be requested for Approved or Cancelled bookings." }, { status: 400 });

  if (booking.payment_method !== "GCash")
    return NextResponse.json({ error: "Refunds only apply to GCash payments." }, { status: 400 });

  // Must have uploaded a receipt (proof of payment)
  if (!booking.payment_receipt_url)
    return NextResponse.json({ error: "No payment receipt found. Refunds require proof of payment." }, { status: 400 });

  // Block duplicate active refund requests for this booking
  const { data: existing } = await supabase
    .from("refund_requests")
    .select("id")
    .eq("booking_id", booking_id)
    .in("status", ["Pending", "Processing"])
    .maybeSingle();

  if (existing)
    return NextResponse.json({ error: "A refund request for this booking is already active." }, { status: 400 });

  const bookingProperty = booking.properties as unknown as {
    title: string; landlord_email: string; landlord_name: string;
  } | { title: string; landlord_email: string; landlord_name: string }[] | null;
  const prop = Array.isArray(bookingProperty) ? bookingProperty[0] ?? null : bookingProperty;

  // Insert refund request
  const { data: refund, error: insertErr } = await supabase
    .from("refund_requests")
    .insert({
      booking_id,
      tenant_email,
      tenant_name: booking.user_name ?? tenant_email,
      property_id: booking.property_id,
      payment_method: booking.payment_method,
      reason: reason?.trim() || null,
      status: "Pending",
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const title = prop?.title ?? "your property";

  // Notify landlord
  if (prop?.landlord_email) {
    await supabase.from("notifications").insert({
      user_email: prop.landlord_email,
      message: `💸 Tenant "${booking.user_name ?? tenant_email}" has requested a refund for "${title}" (${booking.payment_method}). Please review it in your dashboard.`,
      type: "info",
      is_read: false,
      link: "/landlord",
    });
  }

  // Notify all admins
  const { data: admins } = await supabase
    .from("users")
    .select("email")
    .eq("role", "admin");

  const adminNotifs = (admins ?? [])
    .filter((a: { email: string }) => a.email !== prop?.landlord_email)
    .map((a: { email: string }) => ({
      user_email: a.email,
      message: `💸 Refund request submitted by "${booking.user_name ?? tenant_email}" for "${title}".`,
      type: "info",
      is_read: false,
      link: "/admin",
    }));

  if (adminNotifs.length) await supabase.from("notifications").insert(adminNotifs);

  return NextResponse.json(refund, { status: 201 });
}

// ── PATCH /api/refunds ────────────────────────────────────────────────────────
// Landlord/admin marks a refund as Processing, Processed, or Denied
// Accepts multipart/form-data when uploading proof (Processed status)
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const contentType = req.headers.get("content-type") ?? "";

  let id = "", status = "", actor_email = "", role = "", landlord_note = "";
  let proofFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    id           = fd.get("id")           as string;
    status       = fd.get("status")       as string;
    actor_email  = fd.get("actor_email")  as string;
    role         = fd.get("role")         as string;
    landlord_note = (fd.get("landlord_note") as string) ?? "";
    proofFile    = fd.get("proof") as File | null;
  } else {
    const body = await req.json();
    id = body.id; status = body.status;
    actor_email = body.actor_email; role = body.role;
    landlord_note = body.landlord_note ?? "";
  }

  if (!id || !status || !actor_email || !role)
    return NextResponse.json({ error: "id, status, actor_email, and role are required." }, { status: 400 });

  const allowed = ["Processing", "Processed", "Denied"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: `status must be one of: ${allowed.join(", ")}` }, { status: 400 });

  // Fetch the refund request
  const { data: refund, error: fetchErr } = await supabase
    .from("refund_requests")
    .select("id, booking_id, tenant_email, tenant_name, property_id, payment_method, status, properties(title, landlord_email)")
    .eq("id", id)
    .single();

  if (fetchErr || !refund)
    return NextResponse.json({ error: "Refund request not found." }, { status: 404 });

  const refundProperty = refund.properties as unknown as
    | { title: string; landlord_email: string }
    | { title: string; landlord_email: string }[]
    | null;
  const prop = Array.isArray(refundProperty) ? refundProperty[0] ?? null : refundProperty;
  const isAdmin    = role === "admin";
  const isLandlord = role === "landlord" && prop?.landlord_email === actor_email;

  if (!isAdmin && !isLandlord)
    return NextResponse.json({ error: "Only the assigned landlord or an admin can update a refund request." }, { status: 403 });

  // ── Upload proof of refund screenshot if provided ───────────────────────
  let refund_proof_url: string | null = null;
  if (proofFile && proofFile.size > 0) {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "tenant-documents")) {
      await supabase.storage.createBucket("tenant-documents", { public: true, fileSizeLimit: 10485760 });
    }
    const ext      = proofFile.name.split(".").pop();
    const fileName = `refund-proofs/${id}/${Date.now()}.${ext}`;
    const bytes    = new Uint8Array(await proofFile.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from("tenant-documents")
      .upload(fileName, bytes, { contentType: proofFile.type, upsert: true });
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("tenant-documents").getPublicUrl(fileName);
      refund_proof_url = urlData.publicUrl;
    }
  }

  const updatePayload: Record<string, unknown> = {
    status,
    landlord_note: landlord_note?.trim() || null,
    resolved_at: ["Processed", "Denied"].includes(status) ? new Date().toISOString() : null,
  };
  if (refund_proof_url) updatePayload.refund_proof_url = refund_proof_url;

  const { data: updated, error: updateErr } = await supabase
    .from("refund_requests")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const title = prop?.title ?? "your property";

  // Notify tenant of each status change
  const messages: Record<string, string> = {
    Processing: `🔄 Your refund request for "${title}" is now being processed. The landlord will send the amount via ${refund.payment_method} shortly.`,
    Processed:  `✅ Your refund for "${title}" has been processed via ${refund.payment_method}. Please check your account.${landlord_note ? ` Note: "${landlord_note}"` : ""}${refund_proof_url ? " The landlord has uploaded a proof of transfer." : ""}`,
    Denied:     `❌ Your refund request for "${title}" was denied.${landlord_note ? ` Reason: "${landlord_note}"` : " Please contact the landlord for more details."}`,
  };

  await supabase.from("notifications").insert({
    user_email: refund.tenant_email,
    message: messages[status],
    type: status === "Denied" ? "error" : "success",
    is_read: false,
    link: "/bookings",
  });

  return NextResponse.json(updated);
}
