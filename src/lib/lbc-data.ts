import {
  callLbcEndpoint,
  getLbcRows,
  type LbcEndpoint,
  type LbcLogicalMethod,
} from "@/lib/lbc-api";

export type LbcDataError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type LbcDataRow = Record<string, any>;

export type LbcDataResult<T = any[]> = {
  data: T;
  error: LbcDataError | null;
  count?: number | null;
};

type Filter = {
  operator: string;
  column: string;
  value?: unknown;
  values?: unknown[];
};

type QueryState = {
  resource: string;
  columns?: string;
  filters: Filter[];
  order?: { column: string; ascending: boolean };
  limit?: number;
  range?: { from: number; to: number };
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
  mutation?: "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  single?: boolean;
  maybeSingle?: boolean;
};

const RESOURCE_ENDPOINTS: Record<string, string> = {
  users: "members",
  customer_opportunities: "projects",
  opportunities: "projects",
  customers: "businesses",
  partners: "businesses",
  membership_plans: "plans",
  plan_features: "plan-features",
  subscription_features: "subscription-features",
  subscriptions: "subscriptions",
  payments: "payments",
  post_media: "post-media",
  post_likes: "post-likes",
  comment_likes: "comment-likes",
  chat_participants: "chat-participants",
  message_read_status: "message-read-status",
  conversation_participants: "conversation-participants",
  conversation_read_status: "conversation-read-status",
  opportunity_interests: "project-interests",
  user_tags: "member-tags",
  entry_fee_settings: "entry-fee-settings",
  register_tokens: "register-tokens",
};

const resourceEndpoint = (resource: string) =>
  RESOURCE_ENDPOINTS[resource] || resource.replace(/_/g, "-");

const getAuthToken = () => {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("authToken") ||
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("authToken="))
      ?.slice("authToken=".length) ||
    ""
  );
};

const unwrapData = (value: unknown) => {
  const rows = getLbcRows(value);
  if (rows.length > 0) return rows;
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "data" in value
  ) {
    return (value as { data?: unknown }).data ?? value;
  }
  return value;
};

const comparable = (value: unknown) =>
  typeof value === "string" ? value.toLocaleLowerCase("tr-TR") : value;

const applyFilters = (rows: unknown[], filters: Filter[]) =>
  rows.filter((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return filters.every((filter) => {
      const actual = row[filter.column];
      const expected = filter.value;
      switch (filter.operator) {
        case "eq":
          return comparable(actual) === comparable(expected);
        case "neq":
          return comparable(actual) !== comparable(expected);
        case "gt":
          return Number(actual) > Number(expected);
        case "gte":
          return Number(actual) >= Number(expected);
        case "lt":
          return Number(actual) < Number(expected);
        case "lte":
          return Number(actual) <= Number(expected);
        case "in":
          return (filter.values || []).map(comparable).includes(comparable(actual));
        case "is":
          return expected === null ? actual === null || actual === undefined : actual === expected;
        case "ilike":
        case "like": {
          const needle = String(expected || "").replace(/%/g, "").toLocaleLowerCase("tr-TR");
          return String(actual || "").toLocaleLowerCase("tr-TR").includes(needle);
        }
        case "not":
          return comparable(actual) !== comparable(expected);
        default:
          return true;
      }
    });
  });

async function requestLbc(state: QueryState): Promise<LbcDataResult<any[]>> {
  const baseEndpoint = resourceEndpoint(state.resource);
  const idFilter = state.filters.find(
    (filter) => filter.operator === "eq" && filter.column === "id",
  );
  const endpoint = `/${baseEndpoint}${idFilter?.value !== undefined ? `/${encodeURIComponent(String(idFilter.value))}` : ""}` as LbcEndpoint;
  const logicalMethod: LbcLogicalMethod =
    state.mutation === "insert" || state.mutation === "upsert"
      ? "POST"
      : state.mutation === "update"
        ? "PATCH"
        : state.mutation === "delete"
          ? "DELETE"
          : "GET";
  const query = {
    columns: state.columns,
    filters: state.filters,
    order: state.order,
    limit: state.limit,
    range: state.range,
    count: state.count,
    head: state.head,
    mutation: state.mutation,
  };

  try {
    let success: boolean;
    let status: number;
    let data: unknown;
    let error: string | undefined;
    let bodyError: { code?: string; details?: unknown } | undefined;

    if (typeof window !== "undefined") {
      const token = getAuthToken();
      const response = await fetch("/api/lbc-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint,
          logicalMethod,
          payload: state.values,
          query,
        }),
      });
      const result = await response.json().catch(() => ({}));
      success = response.ok && result.success === true;
      status = result.status || response.status;
      data = result.data;
      error = result.error;
      bodyError = result.bodyError;
    } else {
      const result = await callLbcEndpoint(endpoint, {
        logicalMethod,
        payload: state.values,
        extraBody: { query },
      });
      success = result.success;
      status = result.status;
      data = result.data;
      error = result.error;
      bodyError = result.bodyError;
    }

    if (!success) {
      return {
        data: [],
        error: {
          message: error || `LBC endpoint failed with status ${status}`,
          code: bodyError?.code,
          details: bodyError?.details,
        },
        count: null,
      };
    }

    let normalized: any = unwrapData(data);
    if (Array.isArray(normalized)) {
      normalized = applyFilters(normalized, state.filters);
      if (state.order) {
        const { column, ascending } = state.order;
        normalized = [...normalized].sort((a: LbcDataRow, b: LbcDataRow) => {
          const av = (a as Record<string, unknown>)[column];
          const bv = (b as Record<string, unknown>)[column];
          return (String(av) > String(bv) ? 1 : String(av) < String(bv) ? -1 : 0) * (ascending ? 1 : -1);
        });
      }
      if (state.range) normalized = normalized.slice(state.range.from, state.range.to + 1);
      if (state.limit !== undefined) normalized = normalized.slice(0, state.limit);
    }
    const count = Array.isArray(normalized) ? normalized.length : normalized ? 1 : 0;
    if (state.head) return { data: [], error: null, count };
    if (state.single || state.maybeSingle) {
      const single = Array.isArray(normalized) ? normalized[0] || null : normalized;
      if (state.single && !single) {
        return {
          data: {} as any,
          error: { message: "LBC record not found", code: "PGRST116" },
          count,
        };
      }
      return { data: single, error: null, count };
    }
    return { data: normalized, error: null, count };
  } catch (cause) {
    return {
      data: [],
      error: {
        message: cause instanceof Error ? cause.message : "LBC request failed",
        code: "LBC_REQUEST_FAILED",
      },
      count: null,
    };
  }
}

class LbcQueryBuilder implements PromiseLike<LbcDataResult<any[]>> {
  private state: QueryState;

  constructor(resource: string) {
    this.state = { resource, filters: [] };
  }

  select(columns = "*", options: { count?: QueryState["count"]; head?: boolean } = {}) {
    this.state.columns = columns;
    this.state.count = options.count;
    this.state.head = options.head;
    return this;
  }

  insert(values: unknown, _options?: Record<string, unknown>) { this.state.mutation = "insert"; this.state.values = values; return this; }
  upsert(values: unknown, _options?: Record<string, unknown>) { this.state.mutation = "upsert"; this.state.values = values; return this; }
  update(values: unknown) { this.state.mutation = "update"; this.state.values = values; return this; }
  delete() { this.state.mutation = "delete"; return this; }
  eq(column: string, value: unknown) { this.state.filters.push({ operator: "eq", column, value }); return this; }
  neq(column: string, value: unknown) { this.state.filters.push({ operator: "neq", column, value }); return this; }
  gt(column: string, value: unknown) { this.state.filters.push({ operator: "gt", column, value }); return this; }
  gte(column: string, value: unknown) { this.state.filters.push({ operator: "gte", column, value }); return this; }
  lt(column: string, value: unknown) { this.state.filters.push({ operator: "lt", column, value }); return this; }
  lte(column: string, value: unknown) { this.state.filters.push({ operator: "lte", column, value }); return this; }
  in(column: string, values: unknown[]) { this.state.filters.push({ operator: "in", column, values }); return this; }
  is(column: string, value: unknown) { this.state.filters.push({ operator: "is", column, value }); return this; }
  ilike(column: string, value: unknown) { this.state.filters.push({ operator: "ilike", column, value }); return this; }
  like(column: string, value: unknown) { this.state.filters.push({ operator: "like", column, value }); return this; }
  not(column: string, operator: string, value: unknown) { this.state.filters.push({ operator: operator === "in" ? "not-in" : "not", column, value }); return this; }
  contains(column: string, value: unknown) { this.state.filters.push({ operator: "contains", column, value }); return this; }
  filter(column: string, operator: string, value: unknown) { this.state.filters.push({ operator, column, value }); return this; }
  match(values: Record<string, unknown>) { for (const [column, value] of Object.entries(values)) this.eq(column, value); return this; }
  or(value: string) { this.state.filters.push({ operator: "or", column: "*", value }); return this; }
  order(column: string, options: { ascending?: boolean } = {}) { this.state.order = { column, ascending: options.ascending !== false }; return this; }
  limit(value: number) { this.state.limit = value; return this; }
  range(from: number, to: number) { this.state.range = { from, to }; return this; }
  single() { this.state.single = true; return requestLbc(this.state) as unknown as Promise<LbcDataResult<any>>; }
  maybeSingle() { this.state.maybeSingle = true; return requestLbc(this.state) as unknown as Promise<LbcDataResult<any>>; }
  then<TResult1 = LbcDataResult<any[]>, TResult2 = never>(
    onfulfilled?: ((value: LbcDataResult<any[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return requestLbc(this.state).then(onfulfilled, onrejected);
  }
}

const realtimeChannel = () => {
  const channel = {
    on: (
      _event: string,
      _filter: Record<string, unknown>,
      _callback: (payload: any) => void,
    ) => channel,
    subscribe: () => channel,
    unsubscribe: async () => ({ status: "ok" }),
  };
  return channel;
};

export class LbcDataClient {
  from(resource: string) { return new LbcQueryBuilder(resource); }
  async rpc(name: string, args?: Record<string, unknown>): Promise<LbcDataResult<any[]>> {
    if (typeof window !== "undefined") {
      const token = getAuthToken();
      const response = await fetch("/api/lbc-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint: `/rpc/${name}`,
          logicalMethod: "POST",
          payload: args,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return response.ok
        ? { data: unwrapData(result.data) as any[], error: null }
        : {
            data: [],
            error: {
              message: result.error || "LBC RPC failed",
              code: result.bodyError?.code,
            },
          };
    }
    const result = await callLbcEndpoint(`/rpc/${name}` as LbcEndpoint, {
      logicalMethod: "POST",
      payload: args,
    });
    return result.success
      ? { data: unwrapData(result.data) as any[], error: null }
      : { data: [], error: { message: result.error || "LBC RPC failed", code: result.bodyError?.code } };
  }
  channel(_name: string) { return realtimeChannel(); }
  removeChannel(_channel: unknown) { return Promise.resolve("ok"); }
  realtime = { connect: () => undefined, disconnect: () => undefined, isConnected: () => false };
  auth = {
    updateUser: async (values: Record<string, unknown>) => {
      if (typeof window === "undefined") {
        const result = await callLbcEndpoint("/auth/change-password", {
          logicalMethod: "PATCH",
          payload: values,
        });
        return result.success
          ? { data: result.data, error: null }
          : { data: null, error: { message: result.error || "LBC auth update failed" } };
      }
      const token = getAuthToken();
      const response = await fetch("/api/lbc-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint: "/auth/change-password",
          logicalMethod: "PATCH",
          payload: values,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return response.ok
        ? { data: result.data, error: null }
        : { data: null, error: { message: result.error || "LBC auth update failed" } };
    },
  };
}

export const lbcData = new LbcDataClient();
export const createClient = () => lbcData;
export const initializeRealtime = () => undefined;
export const checkLbcDataConnection = async () => {
  const result = await lbcData.from("users").select("id").limit(1);
  return !result.error;
};
