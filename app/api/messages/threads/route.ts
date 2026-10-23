import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/messages/threads?email=x
// Returns one thread per property the user has messaged a landlord about
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("messages")
    .select("id, property_id, sender_email, receiver_email, content, created_at, is_read")
    .or(`sender_email.eq.${normalizedEmail},receiver_email.eq.${normalizedEmail}`)
    .not("property_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = [...new Set((data ?? []).map((m) => m.property_id).filter(Boolean))];
  const { data: properties, error: propertiesError } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("id, title, images, landlord_email, landlord_name")
        .in("id", propertyIds)
    : { data: [], error: null };
  if (propertiesError) return NextResponse.json({ error: propertiesError.message }, { status: 500 });
  const propertyById = new Map((properties ?? []).map((property) => [String(property.id), property]));

  // Group by property_id — one thread per property
  const threads: Record<string, {
    property_id: string;
    property_title: string;
    property_image: string | null;
    landlord_email: string;
    landlord_name: string;
    last_message: string;
    last_at: string;
    unread: number;
  }> = {};

  for (const m of data ?? []) {
    const key = m.property_id;
    if (!threads[key]) {
      const prop = propertyById.get(String(m.property_id));
      threads[key] = {
        property_id: m.property_id,
        property_title: prop?.title ?? "—",
        property_image: prop?.images?.[0] ?? null,
        landlord_email: prop?.landlord_email ?? "",
        landlord_name: prop?.landlord_name ?? "Landlord",
        last_message: m.content,
        last_at: m.created_at,
        unread: 0,
      };
    }
    if (!m.is_read && m.receiver_email?.toLowerCase() === normalizedEmail) threads[key].unread++;
  }

  return NextResponse.json(Object.values(threads));
}
