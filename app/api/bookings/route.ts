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

  // Accept multipart/form-data (files) or JSON (no files)
  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, string> = {};
  let govIdFile:      File | null = null;
  let incomeFile:     File | null = null;
  let receiptFile:    File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    fd.forEach((v, k) => { if (typeof v === "string") fields[k] = v; });
    govIdFile    = fd.get("gov_id")           as File | null;
    incomeFile   = fd.get("income_proof")     as File | null;
    receiptFile  = fd.get("payment_receipt")  as File | null;
  } else {
    fields = await req.json();
  }

  const {
    property_id, user_email, user_name, move_in_date,
    message, payment_method,
    lease_duration, move_out_date, occupants,
    introduction, employment_status, contact_method,
  } = fields;

  if (!property_id || !user_email || !move_in_date)
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

  // ── 1. Move-in date must be today or later ──────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const moveIn = new Date(move_in_date);
  if (moveIn < today)
    return NextResponse.json({ error: "Move-in date must be today or a future date." }, { status: 400 });

  // ── 2. Fetch the property ────────────────────────────────
  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("id, status, landlord_email")
    .eq("id", property_id)
    .single();

  if (propError || !property)
    return NextResponse.json({ error: "Property not found." }, { status: 404 });

  // ── 3. Block if property is not Available ───────────────
  if (property.status !== "Available")
    return NextResponse.json({
      error: `This property is currently ${property.status} and cannot be booked.`,
    }, { status: 400 });

  // ── 4. Block landlords from booking their own property ──
  if (property.landlord_email && property.landlord_email === user_email)
    return NextResponse.json({ error: "You cannot book your own property." }, { status: 403 });

  // ── 5. Block duplicate active bookings ──────────────────
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", property_id)
    .eq("user_email", user_email)
    .in("status", ["Pending", "Approved"])
    .maybeSingle();

  if (existing)
    return NextResponse.json({
      error: "You already have an active booking for this property.",
    }, { status: 400 });

  // ── 6. Upload documents to Supabase Storage ──────────────
  async function uploadDoc(file: File, prefix: string): Promise<string | null> {
    if (!file || file.size === 0) return null;
    // Ensure bucket exists (public so stored URLs work directly)
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "tenant-documents")) {
      const { error: bucketErr } = await supabase.storage.createBucket("tenant-documents", {
        public: true,
        fileSizeLimit: 10485760,
      });
      if (bucketErr) { console.error("Bucket creation error:", bucketErr); return null; }
    }
    const ext      = file.name.split(".").pop();
    const fileName = `${prefix}/${user_email.replace(/[^a-z0-9]/gi, "_")}/${Date.now()}.${ext}`;
    const bytes    = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from("tenant-documents")
      .upload(fileName, bytes, { contentType: file.type, upsert: true });
    if (uploadErr) { console.error("Upload error:", uploadErr); return null; }
    const { data: urlData } = supabase.storage
      .from("tenant-documents")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  const gov_id_url       = govIdFile   && govIdFile.size   > 0 ? await uploadDoc(govIdFile,   "gov-id")   : null;
  const income_proof_url = incomeFile  && incomeFile.size  > 0 ? await uploadDoc(incomeFile,  "income")   : null;
  const payment_receipt_url = receiptFile && receiptFile.size > 0 ? await uploadDoc(receiptFile, "receipts") : null;

  // ── 7. Insert booking ────────────────────────────────────
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      property_id,
      user_email,
      user_name,
      move_in_date,
      move_out_date:      move_out_date      || null,
      message,
      payment_method:     payment_method     ?? "Cash",
      lease_duration:     lease_duration     || null,
      occupants:          occupants          ? Number(occupants) : null,
      introduction:       introduction       || null,
      employment_status:  employment_status  || null,
      contact_method:     contact_method     || null,
      gov_id_url,
      income_proof_url,
      payment_receipt_url,
      payment_confirmed: false,
      status: "Pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, status, user_email, role } = await req.json();

  if (!id || !status)
    return NextResponse.json({ error: "id and status required." }, { status: 400 });

  // ── Security: fetch the booking first ───────────────────
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_email, status, property_id, properties(title, landlord_email)")
    .eq("id", id)
    .single();

  if (fetchError || !booking)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const isAdmin    = role === "admin";
  const isTenant   = user_email && booking.user_email === user_email;
  const landlordEmail = (booking.properties as { landlord_email?: string } | null)?.landlord_email;
  const isLandlord = user_email && landlordEmail === user_email;

  // ── Cancellation: tenant can only cancel Pending bookings ─
  if (status === "Cancelled") {
    if (!isTenant && !isAdmin)
      return NextResponse.json({ error: "Only the tenant or admin can cancel a booking." }, { status: 403 });
    // Tenants cannot cancel once a booking has been approved — only admin can
    if (booking.status === "Approved" && !isAdmin)
      return NextResponse.json({ error: "Your booking has been approved and can no longer be cancelled. Please contact the landlord." }, { status: 403 });
    if (!["Pending", "Approved"].includes(booking.status))
      return NextResponse.json({ error: "Only Pending bookings can be cancelled." }, { status: 400 });
  }

  // ── Approve/Reject: admin or landlord only ───────────────
  if (status === "Approved" || status === "Rejected") {
    if (!isAdmin && !isLandlord)
      return NextResponse.json({ error: "Only admin or the assigned landlord can approve or reject bookings." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("*, properties(title)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";

  // ── On Approve: mark property Booked + auto-reject others
  if (status === "Approved") {
    await supabase
      .from("properties")
      .update({ status: "Booked" })
      .eq("id", booking.property_id);

    // Auto-reject all other Pending bookings for the same property
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

      // Notify rejected tenants
      const rejectNotifs = others.map((o) => ({
        user_email: o.user_email,
        message: `Your booking for "${title}" was not approved — another tenant was selected.`,
        type: "error",
        is_read: false,
      }));
      if (rejectNotifs.length) await supabase.from("notifications").insert(rejectNotifs);
    }

    // Notify approved tenant
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: `✅ Your booking for "${title}" has been approved! The landlord will contact you soon.`,
      type: "success",
      is_read: false,
    });
  }

  // ── On Cancel: restore property to Available ─────────────
  if (status === "Cancelled" && booking.status === "Approved") {
    await supabase
      .from("properties")
      .update({ status: "Available" })
      .eq("id", booking.property_id);
  }

  // ── On Reject: notify tenant ─────────────────────────────
  if (status === "Rejected") {
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: `❌ Your booking for "${title}" was not approved. You may apply for another property.`,
      type: "error",
      is_read: false,
    });
  }

  return NextResponse.json(data);
}

// PUT — tenant uploads a payment receipt after booking is approved
// Also used by landlord to confirm payment (body: { id, landlord_email, confirm: true })
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const contentType = req.headers.get("content-type") ?? "";

  // ── Landlord confirms payment ────────────────────────────
  if (contentType.includes("application/json")) {
    const { id, landlord_email, confirm } = await req.json();
    if (!id || !landlord_email || !confirm)
      return NextResponse.json({ error: "id, landlord_email and confirm required." }, { status: 400 });

    // Verify booking belongs to this landlord
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, user_email, status, property_id, properties(title, landlord_email)")
      .eq("id", id)
      .single();

    if (fetchErr || !booking)
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    const propLandlord = (booking.properties as { landlord_email?: string } | null)?.landlord_email;
    if (propLandlord !== landlord_email)
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

    const { data, error } = await supabase
      .from("bookings")
      .update({ payment_confirmed: true })
      .eq("id", id)
      .select("*, properties(title)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";
    await supabase.from("notifications").insert({
      user_email: data.user_email,
      message: `💰 Your payment for "${title}" has been confirmed by the landlord!`,
      type: "success",
      is_read: false,
    });

    return NextResponse.json(data);
  }

  // ── Tenant uploads receipt ───────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const id         = fd.get("id")         as string;
    const user_email = fd.get("user_email") as string;
    const file       = fd.get("payment_receipt") as File | null;

    if (!id || !user_email || !file || file.size === 0)
      return NextResponse.json({ error: "id, user_email and payment_receipt are required." }, { status: 400 });

    // Verify booking belongs to this tenant and is Approved
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, user_email, status, properties(title, landlord_email)")
      .eq("id", id)
      .single();

    if (fetchErr || !booking)
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    if (booking.user_email !== user_email)
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

    if (booking.status !== "Approved")
      return NextResponse.json({ error: "You can only upload a receipt for an approved booking." }, { status: 400 });

    // Upload file
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "tenant-documents")) {
      await supabase.storage.createBucket("tenant-documents", { public: true, fileSizeLimit: 10485760 });
    }

    const ext      = file.name.split(".").pop();
    const fileName = `receipts/${user_email.replace(/[^a-z0-9]/gi, "_")}/${Date.now()}.${ext}`;
    const bytes    = new Uint8Array(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("tenant-documents")
      .upload(fileName, bytes, { contentType: file.type, upsert: true });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("tenant-documents").getPublicUrl(fileName);

    const { data, error } = await supabase
      .from("bookings")
      .update({ payment_receipt_url: urlData.publicUrl })
      .eq("id", id)
      .select("*, properties(title)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify landlord
    const landlordEmail = (booking.properties as { landlord_email?: string } | null)?.landlord_email;
    const title = (data as { properties?: { title?: string } }).properties?.title ?? "your property";
    if (landlordEmail) {
      await supabase.from("notifications").insert({
        user_email: landlordEmail,
        message: `📎 A tenant has uploaded a payment receipt for "${title}". Please verify it.`,
        type: "info",
        is_read: false,
      });
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
}
