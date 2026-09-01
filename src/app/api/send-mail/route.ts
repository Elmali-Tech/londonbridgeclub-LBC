import { NextResponse } from "next/server";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const data = await req.json();
  const to = typeof data?.to === "string" ? data.to.trim() : "";
  const subject = typeof data?.subject === "string" ? data.subject.trim() : "";
  const message = typeof data?.message === "string" ? data.message.trim() : "";

  if (
    !to ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    to.length > 320 ||
    !subject ||
    subject.length > 200 ||
    !message ||
    message.length > 10_000
  ) {
    return NextResponse.json(
      { message: "Geçersiz e-posta içeriği." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await transporter.sendMail({
      ...mailOptions,
      to,
      subject,
      text: message,
    });

    return NextResponse.json(
      { message: "E-posta başarıyla gönderildi." },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "E-posta gönderilemedi." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Bu rotaya sadece POST istekleri yapılabilir." },
    { status: 405 }
  );
}
