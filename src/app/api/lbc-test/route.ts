import { NextResponse } from "next/server";
import {
  callLbcEndpoint,
  getLbcApiToken,
  getPayloadError,
  getPayloadStatus,
  normalizeLbcPath,
  pathToLbcEndpoint,
  type LbcEndpoint,
  type LbcLogicalMethod,
} from "@/lib/lbc-api";

export const dynamic = "force-dynamic";

const DEFAULT_CHATBOT_WEBHOOK_URL =
  "https://n8n.alisales.ai/webhook/chatbot-v2";

const ALLOWED_ENDPOINTS = [
  /^\/members(\/[^/]+){0,2}$/,
  /^\/projects(\/[^/]+)?$/,
  /^\/kpi\/dashboard$/,
  /^\/needs(\/[^/]+)?$/,
  /^\/businesses(\/[^/]+)?$/,
  /^\/subscriptions(\/[^/]+){0,3}$/,
  /^\/payments(\/[^/]+){0,3}$/,
  /^\/chatbot-v2$/,
];

type RequestBody = {
  path?: unknown;
  token?: unknown;
  method?: unknown;
  payload?: unknown;
  extraBody?: unknown;
  idempotencyKey?: unknown;
  message?: unknown;
  threadId?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getChatbotWebhookUrl() {
  return process.env.LBC_CHATBOT_WEBHOOK_URL || DEFAULT_CHATBOT_WEBHOOK_URL;
}

function getLogicalMethod(method: unknown): LbcLogicalMethod {
  const normalized = typeof method === "string" ? method.toUpperCase() : "GET";
  return ["GET", "POST", "PATCH", "PUT", "DELETE"].includes(normalized)
    ? (normalized as LbcLogicalMethod)
    : "GET";
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const rawPath = typeof body.path === "string" ? body.path : "";
    const path = normalizeLbcPath(rawPath);

    if (!ALLOWED_ENDPOINTS.some((pattern) => pattern.test(path))) {
      return NextResponse.json(
        {
          success: false,
          error: "Endpoint izin verilen LBC kontrat listesinde yok.",
          path,
          durationMs: Date.now() - startedAt,
        },
        { status: 400 },
      );
    }

    const token = getLbcApiToken(body.token);
    const isChatbotEndpoint = path === "/chatbot-v2";

    if (!isChatbotEndpoint && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "LBC API token bulunamadı.",
          path,
          durationMs: Date.now() - startedAt,
        },
        { status: 400 },
      );
    }

    const ep = pathToLbcEndpoint(path);
    const logicalMethod = getLogicalMethod(body.method);
    const extraBody = isRecord(body.extraBody) ? body.extraBody : undefined;
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : undefined;
    const chatbotMessage =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "Merhaba, bu teknik endpoint testidir. CRM talebi değildir.";
    const chatbotThreadId =
      typeof body.threadId === "string" && body.threadId.trim()
        ? body.threadId.trim()
        : `lbc_apitest_${Date.now()}`;

    if (!isChatbotEndpoint) {
      const result = await callLbcEndpoint(path as LbcEndpoint, {
        token,
        logicalMethod,
        payload: body.payload,
        extraBody,
        idempotencyKey,
      });
      const proxyStatus = result.success
        ? 200
        : result.status === 200
          ? 502
          : result.status;

      return NextResponse.json(result, { status: proxyStatus });
    }

    const response = await fetch(getChatbotWebhookUrl(), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatbotMessage,
        threadId: chatbotThreadId,
        tenant_id: "lbc",
        context: {
          source: "apitest",
          mode: "basic",
          member_as: null,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text();
    const payloadError = getPayloadError(data);
    const payloadStatus = getPayloadStatus(data);
    const payloadFailed =
      (isRecord(data) && data.success === false) || Boolean(payloadError);
    const success = response.ok && !payloadFailed;
    const proxyStatus = success
      ? 200
      : payloadStatus || (response.ok ? 502 : response.status);

    return NextResponse.json(
      {
        success,
        status: response.status,
        statusText: response.statusText,
        path,
        ep,
        durationMs: Date.now() - startedAt,
        contentType,
        error: success
          ? undefined
          : payloadError?.message || payloadError?.code || response.statusText,
        bodyError: success ? undefined : payloadError,
        data,
      },
      { status: proxyStatus },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LBC API çağrısı başarısız.";

    return NextResponse.json(
      {
        success: false,
        error: message,
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
