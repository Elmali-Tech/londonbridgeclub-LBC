import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";
import type { LbcMember } from "@/lib/lbc-api";
import { getLbcMembers, getLbcStableUserId } from "@/lib/lbc-auth";
import { mapLbcMemberToDashboardMember } from "@/lib/lbc-members";

function numberFromUnknown(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lbcRouteIds(member: LbcMember) {
  return new Set(
    [
      member.id,
      `lbc:${member.id}`,
      member.member_id || undefined,
      String(getLbcStableUserId(member.id)),
      member.member_id
        ? String(getLbcStableUserId(member.member_id))
        : undefined,
    ].filter(Boolean) as string[],
  );
}

function mapSuggestedUser(member: LbcMember) {
  return {
    ...mapLbcMemberToDashboardMember(member),
    followerCount:
      numberFromUnknown(member.knows_count) ||
      numberFromUnknown(member.network_score),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const excludeIds = new Set(
      [
        user.lbc_record_id || undefined,
        user.lbc_record_id ? `lbc:${user.lbc_record_id}` : undefined,
        String(user.id),
        ...(searchParams.get("exclude") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ].filter(Boolean) as string[],
    );
    const members = await getLbcMembers();
    let selected = members.filter(
      (member) =>
        !Array.from(lbcRouteIds(member)).some((id) => excludeIds.has(id)),
    );

    if (ids.length > 0) {
      selected = selected.filter((member) =>
        ids.some((id) => lbcRouteIds(member).has(id)),
      );
    } else if (searchParams.has("mostFollowed")) {
      selected = selected
        .sort(
          (a, b) =>
            numberFromUnknown(b.knows_count) +
            numberFromUnknown(b.network_score) -
            numberFromUnknown(a.knows_count) -
            numberFromUnknown(a.network_score),
        )
        .slice(0, 5);
    } else if (searchParams.get("all") !== "true") {
      return NextResponse.json(
        { success: false, error: "No valid query" },
        { status: 400 },
      );
    } else {
      selected = selected.sort(
        (a, b) =>
          new Date(b.membership_start || b.created_at || 0).getTime() -
          new Date(a.membership_start || a.created_at || 0).getTime(),
      );
    }

    return NextResponse.json({
      success: true,
      users: selected.map(mapSuggestedUser),
      dataSource: { primary: "lbc-api", endpoint: "/members" },
    });
  } catch (error) {
    console.error("Suggested users error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
