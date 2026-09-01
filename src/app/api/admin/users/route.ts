import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  SAFE_USER_SELECT,
} from "@/lib/auth";
import { sendUserApprovedEmail, sendSystemNotification } from "@/lib/nodemailer";
import { requireAdmin, requireRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Authenticated admin user directory. Password hashes never leave the server.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["opportunity_manager", "sales_member"]);
    if (auth.response) return auth.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select(SAFE_USER_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { users: data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Admin creates a new member directly (public self-registration is closed)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const session = auth.user;
    const supabase = createClient();

    const body = await request.json();
    const {
      email: rawEmail,
      password,
      fullName,
      status,
      role,
      linkedinUrl,
      websiteUrl,
      dateOfBirth,
    } = body;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (
      !email ||
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      !password ||
      !fullName ||
      !status
    ) {
      return NextResponse.json(
        { error: "Email, password, full name and status are required" },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > 1024) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
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

    const passwordHash = await hashPassword(password);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email,
          password_hash: passwordHash,
          full_name: fullName,
          status,
          role: role || "viewer",
          is_admin: role === "admin",
          linkedin_url: linkedinUrl || null,
          website_url: websiteUrl || null,
          date_of_birth: dateOfBirth || null,
          is_approved: true,
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select(SAFE_USER_SELECT)
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
