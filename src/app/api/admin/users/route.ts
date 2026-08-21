import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession, hashPassword } from "@/lib/auth";
import { sendUserApprovedEmail, sendSystemNotification } from "@/lib/nodemailer";

// POST - Admin creates a new member directly (public self-registration is closed)
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", session.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
      fullName,
      status,
      role,
      linkedinUrl,
      websiteUrl,
      dateOfBirth,
    } = body;

    if (!email || !password || !fullName || !status) {
      return NextResponse.json(
        { error: "Email, password, full name and status are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .eq("email", email);

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email,
          password_hash: passwordHash,
          full_name: fullName,
          status,
          role: role || "viewer",
          linkedin_url: linkedinUrl || null,
          website_url: websiteUrl || null,
          date_of_birth: dateOfBirth || null,
          is_approved: true,
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    try {
      await sendUserApprovedEmail(email, fullName);
      await sendSystemNotification(
        "Member Created by Admin",
        `A new member account was created directly from the admin panel: ${fullName} (${email}), by ${session.full_name}.`
      );
    } catch (mailError) {
      console.error("Member creation email error:", mailError);
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
