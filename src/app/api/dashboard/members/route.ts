import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  callLbcEndpoint,
  getLbcRows,
  type LbcListResponse,
  type LbcMember,
} from "@/lib/lbc-api";
import {
  mapLbcMemberToDashboardMember,
  normalizeMemberEmail,
} from "@/lib/lbc-members";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await callLbcEndpoint<LbcListResponse<LbcMember>>("/members");
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "LBC members endpoint failed",
          code: result.bodyError?.code || "LBC_MEMBERS_UNAVAILABLE",
        },
        { status: result.status >= 400 ? result.status : 502 },
      );
    }

    const sessionEmail = normalizeMemberEmail(session.email);
    const members = getLbcRows<LbcMember>(result.data)
      .filter((member) => normalizeMemberEmail(member.email) !== sessionEmail)
      .map(mapLbcMemberToDashboardMember);

    return NextResponse.json({
      success: true,
      users: members,
      dataSource: {
        primary: "lbc-api",
        endpoint: "/members",
        count: members.length,
      },
    });
  } catch (error) {
    console.error("Error loading dashboard members:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
