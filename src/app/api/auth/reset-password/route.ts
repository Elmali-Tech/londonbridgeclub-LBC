import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

type Body = {
  token?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    let token = (body?.token || "").toString();
    const newPassword = (body?.password || "").toString();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token ve şifre gereklidir" },
        { status: 400 }
      );
    }

    const secret = process.env.RESET_PASSWORD_SECRET;
    if (!secret) {
      console.error("Missing RESET_PASSWORD_SECRET");
      return NextResponse.json(
        { error: "Sunucu yapılandırması eksik" },
        { status: 500 }
      );
    }

    // URL decode token if needed (in case it was encoded)
    try {
      token = decodeURIComponent(token);
    } catch (e) {
      // Token might not be URL encoded, continue
    }

    // verify token format
    const parts = token.split(".");
    if (parts.length !== 2) {
      return NextResponse.json({ error: "Geçersiz token formatı" }, { status: 400 });
    }

    const payloadB64 = parts[0];
    const signature = parts[1];

    // Decode payload
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, "base64").toString("utf-8");
    } catch (e) {
      console.error("Failed to decode payload:", e);
      return NextResponse.json({ error: "Geçersiz token içeriği" }, { status: 400 });
    }

    // Recreate expected signature
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Compare signatures - both should be hex strings
    // Normalize both to lowercase for comparison
    const normalizedReceived = signature.toLowerCase().trim();
    const normalizedExpected = expectedSig.toLowerCase().trim();

    if (normalizedReceived !== normalizedExpected) {
      console.error("Signature mismatch:", {
        received: normalizedReceived.substring(0, 20) + "...",
        expected: normalizedExpected.substring(0, 20) + "...",
      });
      return NextResponse.json(
        { error: "Geçersiz token imzası" },
        { status: 400 }
      );
    }

    const [email, expiresStr] = payload.split("|");
    const expires = Number(expiresStr || 0);
    if (!email || !expires || Date.now() > expires) {
      return NextResponse.json(
        { error: "Token süresi dolmuş veya geçersiz" },
        { status: 400 }
      );
    }

    // Use Supabase server client to find user in `users` table and update password_hash
    const supabase = createClient(); 

    // Find user record in custom users table
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    console.log("reset-password: users query", {
      userError,
      found: users?.length || 0,
    });

    if (userError) {
      console.error("Error querying users table", userError);
      return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const user = users[0];
    const passwordHash = hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    console.log("reset-password: updateError", updateError);

    if (updateError) {
      console.error("Error updating password in users table", updateError);
      return NextResponse.json(
        { error: "Şifre güncellenemedi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}
