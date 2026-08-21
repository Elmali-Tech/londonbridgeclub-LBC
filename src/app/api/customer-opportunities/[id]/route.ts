import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, type LbcEndpoint } from "@/lib/lbc-api";
import type { User } from "@/types/database";

const canManage = (user: User | null) =>
  Boolean(
    user?.is_admin ||
      user?.role === "admin" ||
      user?.role === "opportunity_manager",
  );

const errorResponse = (result: Awaited<ReturnType<typeof callLbcEndpoint>>) =>
  NextResponse.json(
    {
      success: false,
      error: result.error || "LBC project mutation failed",
      code: result.bodyError?.code || "LBC_PROJECT_MUTATION_FAILED",
      details: result.bodyError?.details,
    },
    { status: result.status >= 400 ? result.status : 502 },
  );

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!canManage(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const result = await callLbcEndpoint(
      `/projects/${encodeURIComponent(id)}` as LbcEndpoint,
      {
        logicalMethod: "PATCH",
        payload: {
          ...body,
          updated_by_member_id:
            session.lbc_record_id || session.lbc_member_id || null,
          source: "lbc-web",
        },
        idempotencyKey:
          request.headers.get("idempotency-key") ||
          `project-update:${id}:${Date.now()}`,
      },
    );

    return result.success
      ? NextResponse.json({ success: true, opportunity: result.data })
      : errorResponse(result);
  } catch (error) {
    console.error("LBC project update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!session.is_admin && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins can delete" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const result = await callLbcEndpoint(
      `/projects/${encodeURIComponent(id)}` as LbcEndpoint,
      {
        logicalMethod: "DELETE",
        payload: {
          deleted_by_member_id:
            session.lbc_record_id || session.lbc_member_id || null,
        },
        idempotencyKey:
          request.headers.get("idempotency-key") || `project-delete:${id}`,
      },
    );

    return result.success
      ? NextResponse.json({ success: true })
      : errorResponse(result);
  } catch (error) {
    console.error("LBC project delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
