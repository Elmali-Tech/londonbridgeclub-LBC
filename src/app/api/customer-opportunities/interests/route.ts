import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, getLbcRows } from "@/lib/lbc-api";

export async function GET(request: Request) {
  const session = await validateSession(request);
  if (
    !session ||
    (!session.is_admin &&
      session.role !== "admin" &&
      session.role !== "opportunity_manager" &&
      session.role !== "sales_member")
  ) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Insufficient permissions" },
      { status: 403 },
    );
  }

  const result = await callLbcEndpoint("/project-interests");
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC project interests are unavailable",
        code: result.bodyError?.code || "LBC_PROJECT_INTERESTS_UNAVAILABLE",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    success: true,
    interests: getLbcRows(result.data),
    dataSource: { primary: "lbc-api", endpoint: "/project-interests" },
  });
}
