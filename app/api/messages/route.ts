import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const property_id = searchParams.get("property_id");
  const email = searchParams.get("email");

  if (!property_id || !email)
    return NextResponse.json({ error: "Missing params." }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("property_id", property_id)
    .or(`sender_email.eq.${email},receiver_email.eq.${email}`)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { property_id, sender_email, sender_name, receiver_email, content } = await req.json();

  if (!property_id || !sender_email || !receiver_email || !content)
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  const { data, error } = await supabase.from("messages").insert({
    property_id, sender_email, sender_name, receiver_email, content,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
