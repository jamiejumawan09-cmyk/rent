import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/contact — admin/landlord fetches all messages
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  if (role !== "admin" && role !== "landlord")
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/contact — tenant submits a message
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { name, email, subject, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim())
    return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({ name: name.trim(), email: email.trim(), subject: subject?.trim() || null, message: message.trim(), is_read: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all admins
  const { data: admins } = await supabase.from("users").select("email").eq("role", "admin");
  if (admins?.length) {
    await supabase.from("notifications").insert(
      admins.map((a: { email: string }) => ({
        user_email: a.email,
        message: `📩 New contact message from "${name}" (${email}): "${message.trim().slice(0, 60)}${message.length > 60 ? "…" : ""}"`,
        type: "info",
        is_read: false,
        link: "/admin",
      }))
    );
  }

  // Notify all landlords
  const { data: landlords } = await supabase.from("users").select("email").eq("role", "landlord");
  if (landlords?.length) {
    await supabase.from("notifications").insert(
      landlords.map((l: { email: string }) => ({
        user_email: l.email,
        message: `📩 New contact message from "${name}": "${message.trim().slice(0, 60)}${message.length > 60 ? "…" : ""}"`,
        type: "info",
        is_read: false,
        link: "/landlord",
      }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/contact — mark as read or send reply
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, role, reply, replier_name } = await req.json();

  if (!id || (role !== "admin" && role !== "landlord"))
    return NextResponse.json({ error: "id and valid role required." }, { status: 400 });

  // ── Send reply as notification to the sender ──────────────
  if (reply?.trim()) {
    // Get the contact message to find the sender's email
    const { data: msg, error: fetchErr } = await supabase
      .from("contact_messages")
      .select("email, name, subject")
      .eq("id", id)
      .single();

    if (fetchErr || !msg)
      return NextResponse.json({ error: "Message not found." }, { status: 404 });

    // Check if this user exists in our system
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("email", msg.email)
      .maybeSingle();

    if (user) {
      // Send as in-app notification
      await supabase.from("notifications").insert({
        user_email: msg.email,
        message: `💬 Reply from ${replier_name ?? "Support"} regarding your message${msg.subject ? ` "${msg.subject}"` : ""}: "${reply.trim()}"`,
        type: "info",
        is_read: false,
        link: "/contact",
      });
    }

    // Mark as read when replied
    await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
    return NextResponse.json({ success: true, notified: !!user });
  }

  // ── Mark as read ──────────────────────────────────────────
  const { error } = await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
