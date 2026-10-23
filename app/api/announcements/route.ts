import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { message, type, posted_by } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const { data, error } = await supabase
    .from("announcements")
    .insert({ message: message.trim(), type: type ?? "info", posted_by: posted_by?.trim() || "Admin" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all users about the announcement
  const icon = type === "warning" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
  const { data: users } = await supabase.from("users").select("email");
  if (users?.length) {
    const notifs = users.map((u: { email: string }) => ({
      user_email: u.email,
      message: `${icon} Announcement: ${message.trim()}`,
      type: type === "warning" ? "error" : type === "success" ? "success" : "info",
      is_read: false,
      link: "/home",
    }));
    await supabase.from("notifications").insert(notifs);
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
