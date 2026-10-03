import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// GET /api/test-mail?to=your@email.com
export async function GET(req: NextRequest) {
  const to = new URL(req.url).searchParams.get("to");
  if (!to) return NextResponse.json({ error: "?to= param required" }, { status: 400 });

  try {
    await sendOtpEmail(to, "123456");
    return NextResponse.json({ success: true, message: `Test OTP sent to ${to}` });
  } catch (err) {
    console.error("Test mail error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
