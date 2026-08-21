import { NextResponse } from "next/server";
import { lbcData } from "@/lib/lbc-data";
import { register as registerUser } from "@/lib/auth";
import { getLbcAuthReadiness } from "@/lib/lbc-auth";
import { sendApprovalRequestEmail } from "@/lib/nodemailer";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    email,
    password,
    fullName,
    status,
    linkedinUrl,
    token,
    phone,
    birthDate,
    address,
    profession,
    companyName,
    position,
    employeeCount,
    website,
    interests,
    networkConnections,
    associationMembership,
    isLBCMember,
  } = body;

  if (!email || !password || !fullName || !status) {
    return NextResponse.json(
      { error: "Email, password, fullName and status are required" },
      { status: 400 },
    );
  }

  if (!["personal", "corporate"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid membership status" },
      { status: 400 },
    );
  }

  if (token) {
    const { data, error } = await lbcData
      .from("register_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }
    if (data.used) {
      return NextResponse.json(
        { error: "Bu token zaten kullanılmış" },
        { status: 400 },
      );
    }
    if (data.email !== email) {
      return NextResponse.json(
        { error: "Bu token başka bir email adresi için oluşturulmuş" },
        { status: 400 },
      );
    }
  }

  const profileNotes = [
    profession ? `Profession: ${profession}` : null,
    companyName ? `Company: ${companyName}` : null,
    position ? `Position: ${position}` : null,
    employeeCount ? `Employee Count: ${employeeCount}` : null,
    interests ? `Interests: ${interests}` : null,
    networkConnections ? `Network Connections: ${networkConnections}` : null,
    associationMembership ? `Association Membership: ${associationMembership}` : null,
    typeof isLBCMember === "boolean"
      ? `Existing LBC Member: ${isLBCMember ? "Yes" : "No"}`
      : null,
  ].filter(Boolean).join("\n");

  const readiness = getLbcAuthReadiness();
  if (!readiness.canRegisterMembers) {
    return NextResponse.json(
      {
        error: "LBC auth is not ready for member registration.",
        code: "LBC_AUTH_NOT_READY",
        readiness,
      },
      { status: 503 },
    );
  }

  const user = await registerUser(email, password, fullName, status, linkedinUrl, {
    phone: phone || null,
    address: address || null,
    birth_date: birthDate || null,
    representative_name: fullName,
    title: position || null,
    company_name: companyName || null,
    employee_count: employeeCount || null,
    website_url: website || null,
    interests: interests || null,
    sector: profession || null,
    about: profileNotes || null,
    is_existing_lbc_member: Boolean(isLBCMember),
  });

  if (!user) {
    return NextResponse.json(
      { error: "LBC member registration failed" },
      { status: 500 },
    );
  }

  if (token) {
    const { error } = await lbcData
      .from("register_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("token", token);
    if (error) {
      console.error("LBC register token update failed:", error);
    }
  }

  try {
    await sendApprovalRequestEmail({ fullName, email, status, linkedinUrl });
  } catch (mailError) {
    console.error("Admin notification error:", mailError);
  }

  return NextResponse.json(
    {
      user,
      status: "pending_approval",
      message: "Application sent for approval",
    },
    { status: 200 },
  );
}

export async function GET() {
  return NextResponse.redirect(
    new URL(
      "/register",
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    ),
  );
}
