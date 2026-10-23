import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("messages")
    .select("id, property_id, sender_email, sender_name, receiver_email, content, created_at, is_read")
    .or(`sender_email.eq.${normalizedEmail},receiver_email.eq.${normalizedEmail}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = [...new Set((data ?? []).map((m) => m.property_id).filter(Boolean))];
  const { data: properties, error: propertiesError } = propertyIds.length
    ? await supabase.from("properties").select("id, title").in("id", propertyIds)
    : { data: [], error: null };
  if (propertiesError) return NextResponse.json({ error: propertiesError.message }, { status: 500 });
  const propertyTitles = new Map((properties ?? []).map((property) => [String(property.id), property.title]));

  // Group by (property_id + tenant_email) to show one thread per tenant per property
  const threads: Record<string, {
    property_id: string; property_title: string;
    tenant_email: string; tenant_name: string;
    last_message: string; last_at: string; unread: number;
  }> = {};

  for (const m of data ?? []) {
    const tenantEmail = m.sender_email?.toLowerCase() === normalizedEmail ? m.receiver_email : m.sender_email;
    const tenantName  = m.sender_email?.toLowerCase() === normalizedEmail ? tenantEmail : m.sender_name;
    const key = `${m.property_id}__${tenantEmail}`;
    if (!threads[key]) {
      threads[key] = {
        property_id: m.property_id,
        property_title: propertyTitles.get(String(m.property_id)) ?? "—",
        tenant_email: tenantEmail,
        tenant_name: tenantName,
        last_message: m.content,
        last_at: m.created_at,
        unread: 0,
      };
    }
    if (!m.is_read && m.receiver_email?.toLowerCase() === normalizedEmail) threads[key].unread++;
  }

  return NextResponse.json(Object.values(threads));
}
