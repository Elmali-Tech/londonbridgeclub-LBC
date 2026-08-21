import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, type LbcEndpoint } from "@/lib/lbc-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(request);
  if (
    !session ||
    (!session.is_admin &&
      session.role !== "admin" &&
      session.role !== "opportunity_manager")
  ) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Insufficient permissions" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const result = await callLbcEndpoint(
    `/projects/${encodeURIComponent(id)}` as LbcEndpoint,
    {
      logicalMethod: "PATCH",
      payload: {
        visibility: "members",
        published: true,
        published_by_member_id:
          session.lbc_record_id || session.lbc_member_id || null,
      },
      idempotencyKey: `project-publish:${id}`,
    },
  );

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC project publish failed",
        code: result.bodyError?.code || "LBC_PROJECT_PUBLISH_FAILED",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    success: true,
    opportunity: result.data,
    mode: "published",
  });
}
