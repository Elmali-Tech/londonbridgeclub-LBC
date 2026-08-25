import { NextResponse } from "next/server";
import transporter from "@/lib/nodemailer";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { consumeAuthRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const rateLimit = consumeAuthRateLimit("forgot-password", req, email, {
      windowMs: 60 * 60 * 1000,
      emailLimit: 3,
      ipLimit: 15,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }

    const secret =
      process.env.LBC_RESET_PASSWORD_SECRET ||
      process.env.RESET_PASSWORD_SECRET;
    if (!secret) {
      console.error("Missing RESET_PASSWORD_SECRET env var");
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;
    // Keep the response identical so callers cannot enumerate member emails.
    if (!user?.password_hash) {
      return NextResponse.json({ ok: true });
    }

    const expires = Date.now() + 1000 * 60 * 60;
    const passwordVersion = crypto
      .createHmac("sha256", secret)
      .update(`password-version:${user.password_hash}`)
      .digest("hex");
    const payload = `${email}|${expires}|${passwordVersion}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

    const base =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://londonbridge.club";
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(
      token
    )}`;
    const escapedEmail = escapeHtml(email);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - London Bridge Club</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: #000000; letter-spacing: 1px;">
                      London Bridge Club
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 0 40px 40px;">
                    <div style="margin-bottom: 30px;">
                      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 400; color: #000000;">
                        Password Reset Request
                      </h2>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                        Hello,
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                        We received a request to reset the password for the account associated with <strong>${escapedEmail}</strong>.
                      </p>
                      <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                        Click the button below to reset your password. This link will expire in 1 hour.
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             target="_blank" 
                             rel="noreferrer"
                             style="display: inline-block; padding: 14px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500; letter-spacing: 0.5px; transition: background-color 0.3s;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <div style="margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #666666; font-weight: 500;">
                        Button not working?
                      </p>
                      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666; word-break: break-all;">
                        Copy and paste the link below into your browser:
                      </p>
                      <p style="margin: 10px 0 0; font-size: 12px; color: #999999; word-break: break-all;">
                        ${resetUrl}
                      </p>
                    </div>
                    
                    <!-- Security Notice -->
                    <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #666666; line-height: 1.6;">
                        <strong>Security Notice:</strong>
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                        If you didn't request this password reset, you can safely ignore this email. Your account will remain secure.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #666666; text-align: center;">
                      This email was sent automatically. Please do not reply.
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #999999; text-align: center;">
                      © ${new Date().getFullYear()} London Bridge Club. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_EMAIL,
      to: email,
      subject: "London Bridge Club - Password Reset",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
