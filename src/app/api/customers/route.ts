import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, getLbcRows } from "@/lib/lbc-api";

type RequestBody = Record<string, unknown>;

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getNullableString = (value: unknown) => getString(value) || null;

export async function GET(request: Request) {
  const session = await validateSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await callLbcEndpoint("/businesses", {
    extraBody: { type: "customer" },
  });
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC businesses endpoint is unavailable",
        code: result.bodyError?.code || "LBC_BUSINESSES_UNAVAILABLE",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    success: true,
    customers: getLbcRows(result.data),
    dataSource: { primary: "lbc-api", endpoint: "/businesses" },
  });
}

export async function POST(request: Request) {
  const session = await validateSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const body = (await request.json()) as RequestBody;
  const name = getString(body.name);
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Customer name is required" },
      { status: 400 },
    );
  }

  const result = await callLbcEndpoint("/businesses", {
    logicalMethod: "POST",
    payload: {
      type: "customer",
      name,
      company_name: getNullableString(body.company_name),
      contact_person: getNullableString(body.contact_person),
      referrer_name: getNullableString(body.reference_person),
      email: getNullableString(body.email),
      phone: getNullableString(body.phone),
      notes: getNullableString(body.notes),
      created_by_member_id:
        session.lbc_record_id || session.lbc_member_id || null,
      source: "lbc-web",
    },
    idempotencyKey:
      request.headers.get("idempotency-key") ||
      `business:customer:${name.toLocaleLowerCase("tr-TR")}`,
  });
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC customer creation failed",
        code: result.bodyError?.code || "LBC_BUSINESS_CREATE_FAILED",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({ success: true, customer: result.data });
}
