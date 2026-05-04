import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";
import { sendWelcomeEmail, sendApprovalRequestEmail } from "@/lib/nodemailer";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, fullName, status, linkedinUrl, token } = body;

  // Token kontrolü - OPSIYONEL (Eğer yoksa genel başvuru sayılır)
  let tokenData = null;
  if (token) {
    // Token doğrulama
    const { data, error } = await supabase
      .from("register_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Geçersiz token" },
        { status: 400 }
      );
    }

    // Token zaten kullanılmış mı?
    if (data.used) {
      return NextResponse.json(
        { error: "Bu token zaten kullanılmış" },
        { status: 400 }
      );
    }

    // Token'daki email ile kayıt email'i eşleşiyor mu?
    if (data.email !== email) {
      return NextResponse.json(
        { error: "Bu token başka bir email adresi için oluşturulmuş" },
        { status: 400 }
      );
    }
    
    tokenData = data;
  }


  // Email kontrolü
  const { data: existingUsers } = await supabase
    .from("users")
    .select("*")
    .eq("email", email);

  if (existingUsers && existingUsers.length > 0) {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 400 }
    );
  }

  // Şifreyi hashle
  const passwordHash = hashPassword(password);

  // Kullanıcıyı ekle
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        status,
        linkedin_url: linkedinUrl,
        is_approved: false, // Pending approval
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Token'ı kullanıldı olarak işaretle (eğer varsa)
  if (token) {
    await supabase
      .from("register_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq("token", token);
  }

  // Admin'e onay maili gönder
  try {
    await sendApprovalRequestEmail({
      fullName,
      email,
      status,
      linkedinUrl
    });
  } catch (mailError) {
    console.error("Admin notification error:", mailError);
  }

  return NextResponse.json({ 
    user: data?.[0] || null,
    message: "Application sent for approval" 
  }, { status: 200 });
}

export async function GET() {
  // Redirect accidental browser visits to the API back to the registration page
  return NextResponse.redirect(new URL("/register", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
