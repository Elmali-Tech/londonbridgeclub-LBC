import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, type LbcEndpoint } from "@/lib/lbc-api";

const interestPath = (projectId: string, memberId: string) =>
  `/projects/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(memberId)}` as LbcEndpoint;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const memberId = session.lbc_record_id || session.lbc_member_id;
  if (!memberId) {
    return NextResponse.json(
      { success: false, error: "LBC member id is missing" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await callLbcEndpoint(interestPath(id, memberId));
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC project interest lookup failed",
        code: result.bodyError?.code || "LBC_PROJECT_INTERESTS_UNAVAILABLE",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({ success: true, isInterested: Boolean(result.data) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const memberId = session.lbc_record_id || session.lbc_member_id;
  if (!memberId) {
    return NextResponse.json(
      { success: false, error: "LBC member id is missing" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await callLbcEndpoint(interestPath(id, memberId), {
    logicalMethod: "POST",
    payload: { project_id: id, member_id: memberId, source: "lbc-web" },
    idempotencyKey: `project-interest:${id}:${memberId}`,
  });
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC project interest creation failed",
        code: result.bodyError?.code || "LBC_PROJECT_INTEREST_CREATE_FAILED",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({ success: true, interested: true });
}
