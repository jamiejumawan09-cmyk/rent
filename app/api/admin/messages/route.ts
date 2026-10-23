import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Generates a consistent thread key from two emails (order-independent)
function makeThreadKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

// GET /api/admin/messages?email=admin@x.com&with=landlord@x.com
// Returns messages in the thread between these two users
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const email      = searchParams.get("email");
  const withEmail  = searchParams.get("with");

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // If "with" is provided, return that specific thread's messages
  if (withEmail) {
    const threadKey = makeThreadKey(email, withEmail);
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_email, sender_name, receiver_email, content, created_at, is_read")
      .eq("thread_key", threadKey)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark as read for this user
    const { error: readError } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("thread_key", threadKey)
      .eq("receiver_email", email)
      .eq("is_read", false);

    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    return NextResponse.json(data ?? []);
  }

  // Otherwise return all threads for this user (admin or landlord)
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_email, sender_name, receiver_email, content, created_at, is_read, thread_key")
    .or(`sender_email.eq.${email},receiver_email.eq.${email}`)
    .not("thread_key", "is", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group into threads
  const threads: Record<string, {
    thread_key: string;
    other_email: string;
    other_name: string;
    last_message: string;
    last_at: string;
    unread: number;
  }> = {};

  for (const m of data ?? []) {
    const key = m.thread_key;
    if (!key) continue;
    const otherEmail = m.sender_email === email ? m.receiver_email : m.sender_email;
    const otherName  = m.sender_email === email ? (m.receiver_email) : m.sender_name;

    if (!threads[key]) {
      threads[key] = {
        thread_key: key,
        other_email: otherEmail,
        other_name: otherName,
        last_message: m.content,
        last_at: m.created_at,
        unread: 0,
      };
    }
    if (!m.is_read && m.receiver_email === email) threads[key].unread++;
  }

  return NextResponse.json(Object.values(threads));
}

// POST /api/admin/messages
// Send a direct message between admin and landlord
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { sender_email, sender_name, receiver_email, content } = await req.json();

  if (!sender_email || !receiver_email || !content?.trim())
    return NextResponse.json({ error: "sender_email, receiver_email and content are required." }, { status: 400 });

  const threadKey = makeThreadKey(sender_email, receiver_email);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_email,
      sender_name: sender_name ?? sender_email,
      receiver_email,
      content: content.trim(),
      thread_key: threadKey,
      property_id: null,
      is_read: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the receiver
  const { data: senderUser } = await supabase
    .from("users")
    .select("name")
    .eq("email", sender_email)
    .maybeSingle();

  const { data: receiverUser } = await supabase
    .from("users")
    .select("role")
    .eq("email", receiver_email)
    .maybeSingle();

  await supabase.from("notifications").insert({
    user_email: receiver_email,
    message: `💬 New message from ${senderUser?.name ?? sender_email}: "${content.trim().slice(0, 60)}${content.length > 60 ? "…" : ""}"`,
    type: "info",
    is_read: false,
    link: receiverUser?.role === "admin" ? "/admin" : receiverUser?.role === "landlord" ? "/landlord" : "/messages",
  });

  return NextResponse.json(data, { status: 201 });
}
