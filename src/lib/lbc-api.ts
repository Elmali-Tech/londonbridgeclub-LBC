const DEFAULT_WEBHOOK_URL =
  "https://n8n.alisales.ai/webhook/jnryOeI5SEGbO9vz/webhook/lbc-api";

export type LbcEndpoint = `/${string}`;
export type LbcLogicalMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type LbcPayloadError = {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
};

export type LbcApiResult<T = unknown> = {
  success: boolean;
  status: number;
  statusText: string;
  path: LbcEndpoint;
  ep: string;
  logicalMethod: LbcLogicalMethod;
  durationMs: number;
  contentType: string;
  data: T | null;
  error?: string;
  bodyError?: LbcPayloadError;
};

type LbcMoney = {
  amount?: number | string | null;
  currency?: string | null;
};

type LbcSubscription = {
  id?: string | null;
  status?: string | null;
  tier?: string | null;
  plan?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  currency?: string | null;
  amount?: number | string | null;
  processor_customer_id?: string | null;
  processor_subscription_id?: string | null;
  [key: string]: unknown;
};

export type LbcMember = {
  id: string;
  member_id?: string | null;
  type?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  representative_name?: string | null;
  about?: string | null;
  interests?: string[] | string | null;
  sector?: string | null;
  category?: string | null;
  tier?: string | null;
  is_anchor?: boolean | null;
  lbc_kit_delivered?: boolean | null;
  knows?: Array<{ id?: string | null; name?: string | null }> | null;
  knows_count?: number | string | null;
  membership_start?: string | null;
  network_score?: number | string | null;
  currency?: string | null;
  referrer?: { id?: string | null; name?: string | null } | null;
  active_subscription?: LbcSubscription | null;
  total_lbc_revenue?: number | string | LbcMoney | null;
  created_at?: string | null;
};

export type LbcProject = {
  id: string;
  project_no?: string | null;
  name?: string | null;
  status?: string | null;
  sector?: string | null;
  category?: string | null;
  revenue?: number | string | LbcMoney | null;
  lbc_revenue?: number | string | LbcMoney | null;
  commission_rate?: number | string | null;
  commission_amount?: number | string | LbcMoney | null;
  period?: string | null;
  start_date?: string | null;
  created_at?: string | null;
};

export type LbcKpiDashboard = {
  _status?: number;
  period?: string;
  generated_at?: string;
  revenue?: {
    earned_tl?: number | string | null;
    potential_tl?: number | string | null;
    currency?: string | null;
  };
  commission?: {
    earned_tl?: number | string | null;
    pending_tl?: number | string | null;
    currency?: string | null;
  };
  opportunities?: {
    total?: number | string | null;
    won?: number | string | null;
    lost?: number | string | null;
    active?: number | string | null;
    win_rate?: number | string | null;
  };
  members?: {
    total?: number | string | null;
    by_tier?: Record<string, number>;
  };
  top_sectors?: Array<{
    name?: string | null;
    project_count?: number | string | null;
  }>;
};

export type LbcListResponse<T> = {
  _status?: number;
  data?: T[];
  pagination?: {
    limit?: number;
    next_offset?: string | null;
    has_more?: boolean;
  };
};

export type LbcDashboardSnapshot = {
  members: LbcMember[];
  projects: LbcProject[];
  kpi: LbcKpiDashboard | null;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStatus(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toErrorString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getPayloadError(data: unknown): LbcPayloadError | undefined {
  if (!isRecord(data)) return undefined;

  const rootError = data.error;
  const status = getPayloadStatus(data);

  if (typeof rootError === "string") {
    return {
      status,
      message: rootError,
    };
  }

  if (isRecord(rootError)) {
    return {
      ...rootError,
      status: toStatus(rootError.status) || status,
      code: toErrorString(rootError.code),
      message: toErrorString(rootError.message) || toErrorString(rootError.code),
    };
  }

  if (data.success === false || status) {
    return {
      status,
      code: toErrorString(data.code),
      message:
        toErrorString(data.message) ||
        toErrorString(data.error_code) ||
        "LBC API hata döndürdü.",
    };
  }

  return undefined;
}

export function getPayloadStatus(data: unknown) {
  if (!isRecord(data)) return undefined;

  const rootStatus = toStatus(data.status);
  if (rootStatus) return rootStatus;

  const rootError = data.error;
  if (isRecord(rootError)) {
    return toStatus(rootError.status);
  }

  return undefined;
}

export function normalizeLbcPath(path: string): string {
  const trimmed = path.trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

export function pathToLbcEndpoint(path: string) {
  return normalizeLbcPath(path).replace(/^\/+/, "");
}

export function getLbcWebhookUrl() {
  return process.env.LBC_API_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
}

export function getLbcApiToken(bodyToken?: unknown) {
  const tokenFromBody = typeof bodyToken === "string" ? bodyToken.trim() : "";
  return (
    tokenFromBody ||
    process.env.LBC_API_TOKEN ||
    ""
  ).trim();
}

export function getLbcRows<T>(data: unknown): T[] {
  if (!isRecord(data)) return [];
  return Array.isArray(data.data) ? (data.data as T[]) : [];
}

export async function callLbcEndpoint<T = unknown>(
  path: LbcEndpoint,
  options: {
    token?: unknown;
    logicalMethod?: LbcLogicalMethod;
    payload?: unknown;
    extraBody?: Record<string, unknown>;
    idempotencyKey?: string;
  } = {},
): Promise<LbcApiResult<T>> {
  const startedAt = Date.now();
  const token = getLbcApiToken(options.token);
  const logicalMethod = options.logicalMethod || "GET";

  if (!token) {
    return {
      success: false,
      status: 400,
      statusText: "Missing token",
      path,
      ep: pathToLbcEndpoint(path),
      logicalMethod,
      durationMs: Date.now() - startedAt,
      contentType: "",
      data: null,
      error: "LBC API token bulunamadı.",
      bodyError: {
        status: 400,
        code: "MISSING_TOKEN",
        message: "LBC API token bulunamadı.",
      },
    };
  }

  const authorization = token.toLowerCase().startsWith("bearer ")
    ? token
    : `Bearer ${token}`;
  const ep = pathToLbcEndpoint(path);
  const requestBody: Record<string, unknown> = {
    ep,
    ...(logicalMethod !== "GET" ? { method: logicalMethod } : {}),
    ...(options.payload !== undefined ? { data: options.payload } : {}),
    ...(options.idempotencyKey
      ? { idempotency_key: options.idempotencyKey }
      : {}),
    ...(options.extraBody || {}),
  };
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: authorization,
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetch(getLbcWebhookUrl(), {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(requestBody),
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

  return {
    success,
    status: payloadStatus || response.status,
    statusText: response.statusText,
    path,
    ep,
    logicalMethod,
    durationMs: Date.now() - startedAt,
    contentType,
    data: data as T,
    error: success
      ? undefined
      : payloadError?.message || payloadError?.code || response.statusText,
    bodyError: success ? undefined : payloadError,
  };
}

export async function getLbcDashboardSnapshot(): Promise<LbcDashboardSnapshot> {
  const [membersResult, projectsResult, kpiResult] = await Promise.all([
    callLbcEndpoint<LbcListResponse<LbcMember>>("/members"),
    callLbcEndpoint<LbcListResponse<LbcProject>>("/projects"),
    callLbcEndpoint<LbcKpiDashboard>("/kpi/dashboard"),
  ]);

  return {
    members: membersResult.success ? getLbcRows<LbcMember>(membersResult.data) : [],
    projects: projectsResult.success ? getLbcRows<LbcProject>(projectsResult.data) : [],
    kpi: kpiResult.success ? kpiResult.data : null,
    errors: [membersResult, projectsResult, kpiResult]
      .filter((result) => !result.success)
      .map((result) => `${result.path}: ${result.error || result.statusText}`),
  };
}
