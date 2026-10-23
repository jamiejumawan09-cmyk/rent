import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const formData = await req.formData();

    // ── Status-only update (e.g. admin approve/reject) ──
    const statusOnly = formData.get("status") && !formData.get("title");
    if (statusOnly) {
      const status = formData.get("status") as string;
      const { data, error } = await supabase
        .from("properties")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("DB status update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // ── Full property update ──

    const title = formData.get("title") as string;
    const location = formData.get("location") as string;
    const price = formData.get("price") as string;
    const status = formData.get("status") as string;
    const description = formData.get("description") as string;
    const beds = formData.get("beds") ? Number(formData.get("beds")) : null;
    const baths = formData.get("baths") ? Number(formData.get("baths")) : null;
    const sqm = formData.get("sqm") ? Number(formData.get("sqm")) : null;
    const landlordEmailInput = (formData.get("landlord_email") as string) || "";
    const landlord_email = landlordEmailInput.trim() ? landlordEmailInput.trim().toLowerCase() : null;
    const landlord_name  = (formData.get("landlord_name")  as string) || null;
    const latitude  = formData.get("latitude")  ? Number(formData.get("latitude"))  : undefined;
    const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : undefined;
    const amenities: string[] = JSON.parse((formData.get("amenities") as string) || "[]");
    const newImages = formData.getAll("images") as File[];
    const existingImages: string[] = JSON.parse((formData.get("existingImages") as string) || "[]");

    const imageUrls: string[] = [...existingImages];

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "property-images")) {
      await supabase.storage.createBucket("property-images", { public: true });
    }

    for (const image of newImages) {
      if (!image || image.size === 0) continue;
      const ext = image.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uint8Array = new Uint8Array(await image.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, uint8Array, { contentType: image.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName);
      imageUrls.push(urlData.publicUrl);
    }

    const updateData: Record<string, unknown> = {
      title, location, price, status, description,
      beds, baths, sqm, images: imageUrls,
      landlord_email, landlord_name, amenities,
    };
    if (latitude  !== undefined) updateData.latitude  = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    const { data, error } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("DB update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/properties/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
