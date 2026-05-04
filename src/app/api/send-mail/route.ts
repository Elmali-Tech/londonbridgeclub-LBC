import { NextResponse } from "next/server";
import { transporter, mailOptions } from "@/lib/nodemailer";

export async function POST(req: Request) {
  const data = await req.json();

  const { to, subject, message } = data;

  try {
    await transporter.sendMail({
      ...mailOptions,
      to: to,
      subject: subject,
    });

    return NextResponse.json(
      { message: "E-posta başarıyla gönderildi." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { message: "E-posta gönderilemedi.", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Bu rotaya sadece POST istekleri yapılabilir." },
    { status: 405 }
  );
}
