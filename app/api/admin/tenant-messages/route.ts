import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function isAdmin(supabase: ReturnType<typeof getSupabaseAdmin>, email: string) {
  const { data } = await supabase
    .from("users")
    .select("email, role")
    .ilike("email", email)
    .maybeSingle();
  return data?.role === "admin";
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const params = new URL(req.url).searchParams;
  const adminEmail = params.get("admin_email")?.trim().toLowerCase();
  if (!adminEmail || !(await isAdmin(supabase, adminEmail)))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const propertyId = params.get("property_id");
  const tenantEmail = params.get("tenant_email")?.trim().toLowerCase();
  if (propertyId && tenantEmail) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, property_id, sender_email, sender_name, receiver_email, content, created_at, is_read")
      .eq("property_id", propertyId)
      .or(`sender_email.eq.${tenantEmail},receiver_email.eq.${tenantEmail}`)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, property_id, sender_email, sender_name, receiver_email, content, created_at, is_read")
    .not("property_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = [...new Set((messages ?? []).map((m) => m.property_id).filter(Boolean))];
  const participantEmails = [...new Set((messages ?? []).flatMap((m) => [m.sender_email, m.receiver_email]).filter(Boolean))];
  const [{ data: properties, error: propertyError }, { data: users, error: userError }] = await Promise.all([
    propertyIds.length
      ? supabase.from("properties").select("id, title, landlord_email").in("id", propertyIds)
      : Promise.resolve({ data: [], error: null }),
    participantEmails.length
      ? supabase.from("users").select("email, name, role").in("email", participantEmails)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (propertyError || userError)
    return NextResponse.json({ error: propertyError?.message ?? userError?.message }, { status: 500 });

  const propertiesById = new Map((properties ?? []).map((p) => [String(p.id), p]));
  const usersByEmail = new Map((users ?? []).map((u) => [u.email.toLowerCase(), u]));
  const threads = new Map<string, {
    property_id: string;
    property_title: string;
    tenant_email: string;
    tenant_name: string;
    last_message: string;
    last_at: string;
  }>();

  for (const message of messages ?? []) {
    const property = propertiesById.get(String(message.property_id));
    if (!property) continue;
    const landlordEmail = property.landlord_email?.toLowerCase();
    const tenantEmailForMessage = [message.sender_email, message.receiver_email]
      .map((email) => email?.toLowerCase())
      .find((email) => email && email !== landlordEmail && email !== adminEmail && usersByEmail.get(email)?.role === "user");
    if (!tenantEmailForMessage) continue;

    const key = `${message.property_id}__${tenantEmailForMessage}`;
    if (!threads.has(key)) {
      const tenant = usersByEmail.get(tenantEmailForMessage);
      threads.set(key, {
        property_id: String(message.property_id),
        property_title: property.title,
        tenant_email: tenantEmailForMessage,
        tenant_name: tenant?.name || tenantEmailForMessage,
        last_message: message.content,
        last_at: message.created_at,
      });
    }
  }

  return NextResponse.json([...threads.values()]);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const adminEmail = String(body.admin_email ?? "").trim().toLowerCase();
  const propertyId = String(body.property_id ?? "").trim();
  const tenantEmail = String(body.tenant_email ?? "").trim().toLowerCase();
  const content = String(body.content ?? "").trim();
  if (!adminEmail || !propertyId || !tenantEmail || !content)
    return NextResponse.json({ error: "Admin, property, tenant, and message are required." }, { status: 400 });
  if (!(await isAdmin(supabase, adminEmail)))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });
  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });

  const { data, error } = await supabase.from("messages").insert({
    property_id: propertyId,
    sender_email: adminEmail,
    sender_name: "Admin",
    receiver_email: tenantEmail,
    content,
    is_read: false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("notifications").insert({
    user_email: tenantEmail,
    message: "New reply from HOMERent Admin.",
    type: "info",
    is_read: false,
    link: "/messages",
  });
  return NextResponse.json(data, { status: 201 });
}
