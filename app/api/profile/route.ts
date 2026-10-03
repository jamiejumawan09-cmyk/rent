import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const { data, error } = await supabase
    .from("userss")
    .select("id, name, email, phone, avatar_url, created_at")
    .eq("email", email)
    .single();

  if (error || !data) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { email, name, phone } = body;

  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("userss")
    .update({ name: name.trim(), phone: phone?.trim() ?? null })
    .eq("email", email)
    .select("id, name, email, phone, avatar_url, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { email, current_password, new_password } = await req.json();
  if (!email || !current_password || !new_password)
    return NextResponse.json({ error: "All fields required." }, { status: 400 });

  const { data: user } = await supabase
    .from("userss")
    .select("password_hash")
    .eq("email", email)
    .single();

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const valid = await bcrypt.compare(current_password, user.password_hash ?? "");
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const hash = await bcrypt.hash(new_password, 10);
  const { error } = await supabase.from("userss").update({ password_hash: hash }).eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  // Avatar upload — receives multipart form
  const supabase = getSupabaseAdmin();
  const formData = await req.formData();
  const email  = formData.get("email") as string;
  const avatar = formData.get("avatar") as File;

  if (!email || !avatar || avatar.size === 0)
    return NextResponse.json({ error: "Email and avatar are required." }, { status: 400 });

  const ext      = avatar.name.split(".").pop();
  const fileName = `avatars/${email.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
  const bytes    = new Uint8Array(await avatar.arrayBuffer());

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "avatars")) {
    await supabase.storage.createBucket("avatars", { public: true });
  }

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, bytes, { contentType: avatar.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
  const avatar_url = urlData.publicUrl;

  await supabase.from("userss").update({ avatar_url }).eq("email", email);
  return NextResponse.json({ avatar_url });
}
