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

  const { error: readError } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("property_id", property_id)
    .eq("receiver_email", email)
    .eq("is_read", false);

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const property_id = String(body.property_id ?? "").trim();
  const sender_email = String(body.sender_email ?? "").trim().toLowerCase();
  const sender_name = String(body.sender_name ?? "").trim();
  const receiver_email = String(body.receiver_email ?? "").trim().toLowerCase();
  const content = String(body.content ?? "").trim();

  if (!property_id || !sender_email || !receiver_email || !content)
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("landlord_email")
    .eq("id", property_id)
    .maybeSingle();
  if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });
  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  if (property.landlord_email?.trim().toLowerCase() !== receiver_email)
    return NextResponse.json({ error: "The selected landlord does not own this property." }, { status: 400 });

  const { data, error } = await supabase.from("messages").insert({
    property_id, sender_email, sender_name: sender_name || sender_email, receiver_email, content, is_read: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
