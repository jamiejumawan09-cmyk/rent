import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/notifications?email=x  — latest 20 for this user
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id, message, link, is_read, created_at, booking_id")
    .eq("user_email", email)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH /api/notifications  — mark all as read for this user
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_email", email)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/notifications  — delete one notification
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, email } = await req.json();
  if (!id || !email) return NextResponse.json({ error: "id and email required" }, { status: 400 });

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_email", email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
