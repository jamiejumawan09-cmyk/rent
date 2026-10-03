import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Run all counts in parallel
  const [
    { count: totalProperties },
    { count: totalTenants },
    { count: totalBookings },
    { data: reviews },
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("userss").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "Approved"),
    supabase.from("reviews").select("rating"),
  ]);

  // Unique cities from properties
  const { data: cityRows } = await supabase
    .from("properties")
    .select("location");

  const cities = new Set(
    (cityRows ?? []).map((r) => r.location?.split(",")[0]?.trim()).filter(Boolean)
  );

  // Average rating
  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return NextResponse.json({
    properties: totalProperties ?? 0,
    tenants:    totalTenants    ?? 0,
    cities:     cities.size,
    bookings:   totalBookings   ?? 0,
    avgRating,
    totalReviews: reviews?.length ?? 0,
  });
}
