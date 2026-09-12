import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.verify();
  await transporter.sendMail({
    from: `"HOMERent" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your HOMERent OTP Code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="margin:0 0 8px">Your OTP Code</h2>
        <p style="color:#6b7280;margin:0 0 24px">Use the code below to verify your identity. It expires in 2 minutes.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:8px">${otp}</div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
