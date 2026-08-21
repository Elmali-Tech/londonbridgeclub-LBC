import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  callLbcEndpoint,
  type LbcEndpoint,
  type LbcLogicalMethod,
} from "@/lib/lbc-api";

type RequestBody = {
  endpoint?: string;
  logicalMethod?: LbcLogicalMethod;
  payload?: unknown;
  query?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const method = body.logicalMethod || "GET";
  if (method !== "GET") {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  const endpoint = body.endpoint?.startsWith("/")
    ? body.endpoint
    : `/${body.endpoint || ""}`;
  if (!/^\/[a-z0-9/_-]+$/i.test(endpoint)) {
    return NextResponse.json(
      { success: false, error: "Invalid LBC endpoint" },
      { status: 400 },
    );
  }

  const result = await callLbcEndpoint(endpoint as LbcEndpoint, {
    logicalMethod: method,
    payload: body.payload,
    extraBody: body.query ? { query: body.query } : undefined,
  });
  return NextResponse.json(result, {
    status: result.success ? 200 : result.status >= 400 ? result.status : 502,
  });
}
