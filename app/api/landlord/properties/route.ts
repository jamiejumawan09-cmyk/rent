import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/landlord/properties?email=x  — landlord's own listings
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const email = new URL(req.url).searchParams.get("email")?.trim();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .ilike("landlord_email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — create a new listing owned by this landlord
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();

    const landlord_email = ((formData.get("landlord_email") as string) || "").trim().toLowerCase();
    const landlord_name  = formData.get("landlord_name")  as string;
    const title       = formData.get("title")       as string;
    const location    = formData.get("location")    as string;
    const price       = formData.get("price")       as string;
    const status      = (formData.get("status")     as string) || "Available";
    const description = formData.get("description") as string;
    const beds  = formData.get("beds")  ? Number(formData.get("beds"))  : null;
    const baths = formData.get("baths") ? Number(formData.get("baths")) : null;
    const sqm   = formData.get("sqm")   ? Number(formData.get("sqm"))   : null;
    const images = formData.getAll("images") as File[];
    const latitude  = formData.get("latitude")  ? Number(formData.get("latitude"))  : null;
    const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : null;
    const amenities: string[] = JSON.parse((formData.get("amenities") as string) || "[]");
    if (!landlord_email || !title?.trim() || !price?.trim())
      return NextResponse.json({ error: "Landlord email, title, and price are required." }, { status: 400 });

    // Ensure storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "property-images")) {
      await supabase.storage.createBucket("property-images", { public: true });
    }

    const imageUrls: string[] = [];
    for (const image of images) {
      if (!image || image.size === 0) continue;
      const ext      = image.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const bytes    = new Uint8Array(await image.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("property-images").upload(fileName, bytes, { contentType: image.type });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName);
      imageUrls.push(urlData.publicUrl);
    }

    const { data, error } = await supabase.from("properties").insert({
      landlord_email, landlord_name, title, location, price, status,
      description, beds, baths, sqm, images: imageUrls, latitude, longitude, amenities,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// PATCH — update a landlord's own listing
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();

    const id             = formData.get("id")             as string;
    const landlord_email = ((formData.get("landlord_email") as string) || "").trim().toLowerCase();
    const title       = formData.get("title")       as string;
    const location    = formData.get("location")    as string;
    const price       = formData.get("price")       as string;
    const status      = formData.get("status")      as string;
    const description = formData.get("description") as string;
    const beds  = formData.get("beds")  ? Number(formData.get("beds"))  : null;
    const baths = formData.get("baths") ? Number(formData.get("baths")) : null;
    const sqm   = formData.get("sqm")   ? Number(formData.get("sqm"))   : null;
    const existingImages: string[] = JSON.parse((formData.get("existingImages") as string) || "[]");
    const newImages = formData.getAll("images") as File[];
    const latitude  = formData.get("latitude")  ? Number(formData.get("latitude"))  : null;
    const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : null;
    const amenities: string[] = JSON.parse((formData.get("amenities") as string) || "[]");

    const imageUrls = [...existingImages];
    for (const image of newImages) {
      if (!image || image.size === 0) continue;
      const ext      = image.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const bytes    = new Uint8Array(await image.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("property-images").upload(fileName, bytes, { contentType: image.type });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName);
      imageUrls.push(urlData.publicUrl);
    }

    const { data, error } = await supabase.from("properties")
      .update({ title, location, price, status, description, beds, baths, sqm, images: imageUrls, latitude, longitude, amenities })
      .eq("id", id)
      .ilike("landlord_email", landlord_email) // scope to owner
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// DELETE — landlord deletes own listing
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id, landlord_email: rawLandlordEmail } = await req.json();
  const landlord_email = String(rawLandlordEmail ?? "").trim().toLowerCase();

  const { data: property } = await supabase.from("properties")
    .select("images").eq("id", id).ilike("landlord_email", landlord_email).single();

  if (property?.images?.length) {
    const paths = property.images.map((url: string) => url.split("/property-images/")[1]);
    await supabase.storage.from("property-images").remove(paths);
  }

  const { error } = await supabase.from("properties")
    .delete().eq("id", id).ilike("landlord_email", landlord_email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
