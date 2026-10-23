import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const admin = new URL(req.url).searchParams.get("admin");
  let query = supabase.from("properties").select("*").order("created_at", { ascending: false });
  // Public listing excludes Pending (awaiting admin approval)
  if (!admin) query = query.neq("status", "Pending");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();

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
    const images = formData.getAll("images") as File[];
    const latitude  = formData.get("latitude")  ? Number(formData.get("latitude"))  : null;
    const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : null;
    const amenities: string[] = JSON.parse((formData.get("amenities") as string) || "[]");

    const imageUrls: string[] = [];

    // Ensure the bucket exists (creates it if missing)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "property-images");
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket("property-images", { public: true });
      if (bucketError) {
        console.error("Failed to create bucket:", bucketError);
        return NextResponse.json({ error: "Failed to initialise storage: " + bucketError.message }, { status: 500 });
      }
    }

    for (const image of images) {
      // Skip empty file inputs (no file selected)
      if (!image || image.size === 0) continue;

      const ext = image.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const arrayBuffer = await image.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, uint8Array, { contentType: image.type });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName);
      imageUrls.push(urlData.publicUrl);
    }

    const { data, error } = await supabase.from("properties").insert({
      title, location, price, status, description, beds, baths, sqm,
      images: imageUrls, landlord_email, landlord_name, latitude, longitude, amenities,
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/properties unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();

  const { data: property } = await supabase.from("properties").select("images").eq("id", id).single();

  if (property?.images?.length) {
    const paths = property.images.map((url: string) => url.split("/property-images/")[1]);
    await supabase.storage.from("property-images").remove(paths);
  }

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
