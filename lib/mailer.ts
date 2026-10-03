import nodemailer from "nodemailer";

// Create transporter once (module-level singleton)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.GMAIL_USER?.trim(),
    pass: process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s/g, ""),
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  const info = await transporter.sendMail({
    from: `"HOMERent" <${process.env.GMAIL_USER?.trim()}>`,
    to,
    subject: "Your HOMERent OTP Code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="margin:0 0 8px;color:#1f2937">Your OTP Code</h2>
        <p style="color:#6b7280;margin:0 0 24px">Use the code below to verify your identity. It expires in 2 minutes.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:20px;background:#f3f4f6;border-radius:8px;color:#111827">${otp}</div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
  console.log("OTP email sent:", info.messageId, "to:", to);
  return info;
}
