import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/documents/signed-url
// Body: { url: string }  — the stored URL from the DB (public or private bucket)
// Always returns a fresh signed URL that works regardless of bucket visibility.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { url } = await req.json();

  if (!url) return NextResponse.json({ error: "URL required." }, { status: 400 });

  // Extract file path — handle both public and signed URL formats
  // Public:  .../storage/v1/object/public/tenant-documents/<path>
  // Signed:  .../storage/v1/object/sign/tenant-documents/<path>?token=...
  const markers = [
    "/object/public/tenant-documents/",
    "/object/sign/tenant-documents/",
    "/object/authenticated/tenant-documents/",
  ];

  let filePath: string | null = null;
  for (const marker of markers) {
    if (url.includes(marker)) {
      filePath = url.split(marker)[1]?.split("?")[0] ?? null;
      break;
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: "Could not parse file path from URL." }, { status: 400 });
  }

  filePath = decodeURIComponent(filePath);

  // Ensure bucket exists and is public before signing
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "tenant-documents");

  if (!bucketExists) {
    const { error: bucketErr } = await supabase.storage.createBucket("tenant-documents", {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (bucketErr) {
      return NextResponse.json({ error: "Storage bucket not found and could not be created." }, { status: 500 });
    }
  }

  // Always generate a signed URL — works for both public and private buckets
  const { data, error } = await supabase.storage
    .from("tenant-documents")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    // Fall back: try returning the raw public URL so the client can at least attempt it
    const { data: pubData } = supabase.storage
      .from("tenant-documents")
      .getPublicUrl(filePath);

    if (pubData?.publicUrl) {
      return NextResponse.json({ signedUrl: pubData.publicUrl });
    }

    return NextResponse.json(
      { error: error?.message ?? "Failed to generate document URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
