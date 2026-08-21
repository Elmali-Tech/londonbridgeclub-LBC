import { NextResponse } from "next/server";
import { getLbcAuthReadiness } from "@/lib/lbc-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getLbcAuthReadiness();

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    authProvider: readiness.provider,
    readyForDashboardCutover: readiness.readyForCutover,
    lbc: readiness,
  });
}
