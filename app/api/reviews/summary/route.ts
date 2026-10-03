import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Returns { [property_id]: { avg: number, count: number } }
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("reviews")
    .select("property_id, rating");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group and compute avg per property
  const map: Record<string, { total: number; count: number }> = {};
  for (const row of data ?? []) {
    if (!map[row.property_id]) map[row.property_id] = { total: 0, count: 0 };
    map[row.property_id].total += row.rating;
    map[row.property_id].count += 1;
  }

  const summary: Record<string, { avg: number; count: number }> = {};
  for (const [id, { total, count }] of Object.entries(map)) {
    summary[id] = { avg: Math.round((total / count) * 10) / 10, count };
  }

  return NextResponse.json(summary);
}
