import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  const { id } = await params;
  const { user_email, rating, comment } = await req.json();

  if (!user_email) return NextResponse.json({ error: "user_email required" }, { status: 400 });
  if (rating && (rating < 1 || rating > 5)) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (rating) updates.rating = rating;
  if (comment !== undefined) updates.comment = comment;

  const { data, error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", id)
    .eq("user_email", user_email)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
