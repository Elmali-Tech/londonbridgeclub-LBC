"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock,
  Copy,
  Database,
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";

type EndpointKey =
  | "members"
  | "createMember"
  | "memberProjects"
  | "projects"
  | "kpiDashboard"
  | "memberDetail"
  | "memberKpi"
  | "projectDetail"
  | "needs"
  | "businesses"
  | "chatbotV2";

type EndpointStatus = "idle" | "loading" | "success" | "error" | "skipped";

type EndpointResult = {
  status: EndpointStatus;
  path: string;
  httpStatus?: number;
  statusText?: string;
  durationMs?: number;
  data?: unknown;
  error?: string;
  updatedAt?: string;
};

type EndpointDefinition = {
  key: EndpointKey;
  title: string;
  group: "live" | "contract" | "write" | "widget";
  logicalMethod?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  placeholder: string;
  dependency?: "member" | "project";
  sideEffect?: boolean;
  buildPayload?: (ids: SelectedIds) => unknown;
  buildPath: (ids: SelectedIds) => string | null;
};

type SelectedIds = {
  memberId: string;
  projectId: string;
};

type ProxyResponse = {
  success?: boolean;
  status?: number;
  statusText?: string;
  path?: string;
  durationMs?: number;
  data?: unknown;
  error?: string | { code?: string; message?: string; status?: number };
  bodyError?: { code?: string; message?: string; status?: number };
};

const endpoints: EndpointDefinition[] = [
  {
    key: "members",
    title: "Members",
    group: "live",
    logicalMethod: "GET",
    placeholder: "/members",
    buildPath: () => "/members",
  },
  {
    key: "createMember",
    title: "Create Member",
    group: "write",
    logicalMethod: "POST",
    placeholder: "/members",
    sideEffect: true,
    buildPath: () => "/members",
    buildPayload: () => ({
      email: "apitest.member@londonbridge.club",
      name: "LBC API Test Member",
      full_name: "LBC API Test Member",
      type: "Bireysel HNW",
      tier: "Bronze",
      source: "apitest",
    }),
  },
  {
    key: "memberProjects",
    title: "Member Projects",
    group: "live",
    logicalMethod: "GET",
    placeholder: "/members/{id}/projects",
    dependency: "member",
    buildPath: ({ memberId }) =>
      memberId ? `/members/${encodeURIComponent(memberId)}/projects` : null,
  },
  {
    key: "projects",
    title: "Projects",
    group: "live",
    logicalMethod: "GET",
    placeholder: "/projects",
    buildPath: () => "/projects",
  },
  {
    key: "kpiDashboard",
    title: "KPI Dashboard",
    group: "live",
    logicalMethod: "GET",
    placeholder: "/kpi/dashboard",
    buildPath: () => "/kpi/dashboard",
  },
  {
    key: "chatbotV2",
    title: "Widget Chatbot v2",
    group: "widget",
    logicalMethod: "POST",
    placeholder: "/chatbot-v2",
    sideEffect: true,
    buildPath: () => "/chatbot-v2",
  },
  {
    key: "memberDetail",
    title: "Member Detail",
    group: "contract",
    logicalMethod: "GET",
    placeholder: "/members/{id}",
    dependency: "member",
    buildPath: ({ memberId }) =>
      memberId ? `/members/${encodeURIComponent(memberId)}` : null,
  },
  {
    key: "memberKpi",
    title: "Member KPI",
    group: "contract",
    logicalMethod: "GET",
    placeholder: "/members/{id}/kpi",
    dependency: "member",
    buildPath: ({ memberId }) =>
      memberId ? `/members/${encodeURIComponent(memberId)}/kpi` : null,
  },
  {
    key: "projectDetail",
    title: "Project Detail",
    group: "contract",
    logicalMethod: "GET",
    placeholder: "/projects/{id}",
    dependency: "project",
    buildPath: ({ projectId }) =>
      projectId ? `/projects/${encodeURIComponent(projectId)}` : null,
  },
  {
    key: "needs",
    title: "Needs",
    group: "contract",
    logicalMethod: "GET",
    placeholder: "/needs",
    buildPath: () => "/needs",
  },
  {
    key: "businesses",
    title: "Businesses",
    group: "contract",
    logicalMethod: "GET",
    placeholder: "/businesses",
    buildPath: () => "/businesses",
  },
];

const baseUrl =
  "https://n8n.alisales.ai/webhook/jnryOeI5SEGbO9vz/webhook/lbc-api";
const widgetUrl = "https://n8n.alisales.ai/webhook/chatbot-v2";
const tokenStorageKey = "lbc-api-test-token";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findFirstArray(
  value: unknown,
  preferredKeys: string[],
  depth = 0,
): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isRecord(value) || depth > 4) return null;

  for (const key of preferredKeys) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested;
    const nestedArray = findFirstArray(nested, preferredKeys, depth + 1);
    if (nestedArray) return nestedArray;
  }

  for (const nested of Object.values(value)) {
    const nestedArray = findFirstArray(nested, preferredKeys, depth + 1);
    if (nestedArray) return nestedArray;
  }

  return null;
}

function getStringField(value: unknown, keys: string[]) {
  if (!isRecord(value)) return "";

  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.trim()) return field.trim();
    if (typeof field === "number" && Number.isFinite(field)) {
      return String(field);
    }
  }

  return "";
}

function extractFirstId(
  value: unknown,
  arrayKeys: string[],
  idKeys: string[],
) {
  const collection = findFirstArray(value, arrayKeys);
  const firstItem = collection?.find((item) => getStringField(item, idKeys));
  return getStringField(firstItem, idKeys) || getStringField(value, idKeys);
}

function getItemCount(value: unknown, preferredKeys: string[]) {
  const collection = findFirstArray(value, preferredKeys);
  return collection ? collection.length : null;
}

function formatJson(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? null, null, 2);
}

function createIdleResults(): Record<EndpointKey, EndpointResult> {
  return endpoints.reduce(
    (acc, endpoint) => {
      acc[endpoint.key] = {
        status: "idle",
        path: endpoint.placeholder,
      };
      return acc;
    },
    {} as Record<EndpointKey, EndpointResult>,
  );
}

function statusMeta(status: EndpointStatus) {
  switch (status) {
    case "success":
      return {
        label: "OK",
        icon: CheckCircle2,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "error":
      return {
        label: "Hata",
        icon: XCircle,
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "loading":
      return {
        label: "Çekiliyor",
        icon: RefreshCw,
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "skipped":
      return {
        label: "Atlandı",
        icon: Clock,
        className: "bg-slate-50 text-slate-600 border-slate-200",
      };
    default:
      return {
        label: "Bekliyor",
        icon: CircleAlert,
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
  }
}

function endpointGroupLabel(group: EndpointDefinition["group"]) {
  if (group === "widget") return "Widget";
  if (group === "write") return "Write";
  return group === "live" ? "Canlı" : "Kontrat";
}

export default function ApiTestPage() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [results, setResults] = useState(createIdleResults);
  const [runningAll, setRunningAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<EndpointKey | null>(null);
  const [allowWrites, setAllowWrites] = useState(false);

  const ids = useMemo<SelectedIds>(
    () => ({
      memberId: memberId.trim(),
      projectId: projectId.trim(),
    }),
    [memberId, projectId],
  );

  const summary = useMemo(() => {
    const resultList = Object.values(results);
    const completed = resultList.filter((item) => item.status === "success");
    const failed = resultList.filter((item) => item.status === "error");
    const skipped = resultList.filter((item) => item.status === "skipped");
    const durations = completed
      .map((item) => item.durationMs)
      .filter((duration): duration is number => typeof duration === "number");
    const averageDuration = durations.length
      ? Math.round(
          durations.reduce((total, duration) => total + duration, 0) /
            durations.length,
        )
      : 0;

    return {
      completed: completed.length,
      failed: failed.length,
      skipped: skipped.length,
      averageDuration,
    };
  }, [results]);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(tokenStorageKey);
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token.trim()) {
      window.sessionStorage.setItem(tokenStorageKey, token.trim());
    } else {
      window.sessionStorage.removeItem(tokenStorageKey);
    }
  }, [token]);

  const runEndpoint = async (
    endpoint: EndpointDefinition,
    selectedIds: SelectedIds = ids,
  ): Promise<EndpointResult> => {
    const path = endpoint.buildPath(selectedIds);
    const updatedAt = new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (!path) {
      const dependencyLabel =
        endpoint.dependency === "project" ? "Project ID" : "Member ID";
      const skippedResult: EndpointResult = {
        status: "skipped",
        path: endpoint.placeholder,
        error: `${dependencyLabel} yok.`,
        updatedAt,
      };
      setResults((current) => ({
        ...current,
        [endpoint.key]: skippedResult,
      }));
      return skippedResult;
    }

    if (endpoint.sideEffect && !allowWrites) {
      const skippedResult: EndpointResult = {
        status: "skipped",
        path,
        error: "Yazma/side-effect testi kapalı.",
        updatedAt,
      };
      setResults((current) => ({
        ...current,
        [endpoint.key]: skippedResult,
      }));
      return skippedResult;
    }

    setResults((current) => ({
      ...current,
      [endpoint.key]: {
        ...current[endpoint.key],
        status: "loading",
        path,
        error: undefined,
      },
    }));

    try {
      const response = await fetch("/api/lbc-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          token: token.trim() || undefined,
          method: endpoint.logicalMethod || "GET",
          payload: endpoint.buildPayload?.(selectedIds),
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as ProxyResponse;
      const success = response.ok && payload.success === true;
      const result: EndpointResult = {
        status: success ? "success" : "error",
        path: payload.path || path,
        httpStatus: payload.status || response.status,
        statusText: payload.statusText,
        durationMs: payload.durationMs,
        data: payload.data ?? payload,
        error: success
          ? undefined
          : (typeof payload.error === "string"
              ? payload.error
              : payload.error?.message || payload.error?.code) ||
            payload.bodyError?.message ||
            payload.bodyError?.code ||
            payload.statusText ||
            `HTTP ${payload.status || response.status}`,
        updatedAt,
      };

      setResults((current) => ({
        ...current,
        [endpoint.key]: result,
      }));

      return result;
    } catch (error) {
      const result: EndpointResult = {
        status: "error",
        path,
        error:
          error instanceof Error ? error.message : "Endpoint çağrısı başarısız.",
        updatedAt,
      };

      setResults((current) => ({
        ...current,
        [endpoint.key]: result,
      }));

      return result;
    }
  };

  const inferIdsFromResults = (
    currentMemberId: string,
    currentProjectId: string,
    membersResult?: EndpointResult,
    projectsResult?: EndpointResult,
  ) => {
    const inferredMemberId =
      currentMemberId ||
      extractFirstId(
        membersResult?.data,
        ["members", "data", "items", "results", "users"],
        ["id", "member_id", "memberId", "user_id", "userId", "uuid", "_id"],
      );
    const inferredProjectId =
      currentProjectId ||
      extractFirstId(
        projectsResult?.data,
        ["projects", "data", "items", "results"],
        ["id", "project_id", "projectId", "uuid", "_id"],
      );

    if (!currentMemberId && inferredMemberId) setMemberId(inferredMemberId);
    if (!currentProjectId && inferredProjectId) setProjectId(inferredProjectId);

    return {
      memberId: inferredMemberId,
      projectId: inferredProjectId,
    };
  };

  const runAll = async () => {
    setRunningAll(true);

    try {
      const seedEndpoints = endpoints.filter(
        (endpoint) => !endpoint.dependency && !endpoint.sideEffect,
      );
      const dependentEndpoints = endpoints.filter(
        (endpoint) => endpoint.dependency && !endpoint.sideEffect,
      );
      const sideEffectEndpoints = endpoints.filter(
        (endpoint) => endpoint.sideEffect,
      );
      const seedResults = await Promise.all(
        seedEndpoints.map((endpoint) => runEndpoint(endpoint, ids)),
      );
      const resultByKey = seedEndpoints.reduce(
        (acc, endpoint, index) => {
          acc[endpoint.key] = seedResults[index];
          return acc;
        },
        {} as Partial<Record<EndpointKey, EndpointResult>>,
      );
      const inferredIds = inferIdsFromResults(
        ids.memberId,
        ids.projectId,
        resultByKey.members,
        resultByKey.projects,
      );

      await Promise.all(
        dependentEndpoints.map((endpoint) => runEndpoint(endpoint, inferredIds)),
      );

      const updatedAt = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setResults((current) => {
        const next = { ...current };
        for (const endpoint of sideEffectEndpoints) {
          next[endpoint.key] = {
            status: "skipped",
            path: endpoint.placeholder,
            error:
              "Bu endpoint sohbet mesajı gönderdiği için toplu testte çalıştırılmadı.",
            updatedAt,
          };
        }
        return next;
      });
    } finally {
      setRunningAll(false);
    }
  };

  const resetResults = () => {
    setResults(createIdleResults());
    setCopiedKey(null);
  };

  const copyResult = async (key: EndpointKey) => {
    await navigator.clipboard.writeText(formatJson(results[key].data));
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1400);
  };

  const memberCount = getItemCount(results.members.data, [
    "members",
    "data",
    "items",
    "results",
    "users",
  ]);
  const projectCount = getItemCount(results.projects.data, [
    "projects",
    "data",
    "items",
    "results",
  ]);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                60 req/dk
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <Server className="h-3.5 w-3.5" />
                Token 90 gün
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              LBC API Test
            </h1>
            <p className="mt-2 break-all text-sm text-slate-600">
              API: {baseUrl}
            </p>
            <p className="mt-1 break-all text-sm text-slate-600">
              Widget: {widgetUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={allowWrites}
                onChange={(event) => setAllowWrites(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              Writes
            </label>
            <button
              type="button"
              onClick={runAll}
              disabled={runningAll}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${runningAll ? "animate-spin" : ""}`}
              />
              Tümünü çek
            </button>
            <button
              type="button"
              onClick={resetResults}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <CircleAlert className="h-4 w-4" />
              Sıfırla
            </button>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
                  API Token
                </span>
                <span className="flex h-11 items-center rounded-md border border-slate-300 bg-white focus-within:border-amber-500">
                  <input
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    type={showToken ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    placeholder="WhatsApp ile gelen token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((current) => !current)}
                    className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                    aria-label={showToken ? "Token gizle" : "Token göster"}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 md:w-[360px]">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
                    Member ID
                  </span>
                  <input
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
                    placeholder="auto"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
                    Project ID
                  </span>
                  <input
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
                    placeholder="auto"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                OK
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {summary.completed}/{endpoints.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <XCircle className="h-4 w-4 text-rose-600" />
                Hata
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {summary.failed}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Clock className="h-4 w-4 text-slate-500" />
                Atlandı
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {summary.skipped}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Timer className="h-4 w-4 text-sky-600" />
                Ort.
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {summary.averageDuration ? `${summary.averageDuration}ms` : "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-amber-600" />
              Members
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-semibold">
                {memberCount ?? "-"}
              </div>
              <div className="truncate text-right text-xs text-slate-500">
                {memberId || "ID bekleniyor"}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Activity className="h-4 w-4 text-sky-600" />
              Projects
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-semibold">
                {projectCount ?? "-"}
              </div>
              <div className="truncate text-right text-xs text-slate-500">
                {projectId || "ID bekleniyor"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {endpoints.map((endpoint) => {
            const result = results[endpoint.key];
            const meta = statusMeta(result.status);
            const StatusIcon = meta.icon;
            const resolvedPath = endpoint.buildPath(ids) || endpoint.placeholder;

            return (
              <article
                key={endpoint.key}
                className="flex min-h-[360px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">
                        {endpoint.logicalMethod || "GET"}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          endpoint.group === "live"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : endpoint.group === "widget"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : endpoint.group === "write"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {endpointGroupLabel(endpoint.group)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${meta.className}`}
                      >
                        <StatusIcon
                          className={`h-3.5 w-3.5 ${
                            result.status === "loading" ? "animate-spin" : ""
                          }`}
                        />
                        {meta.label}
                      </span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-slate-950">
                      {endpoint.title}
                    </h2>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      {result.path !== endpoint.placeholder
                        ? result.path
                        : resolvedPath}
                    </p>
                    {endpoint.buildPayload ? (
                      <pre className="mt-2 max-h-24 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-[11px] leading-4 text-slate-600">
                        {formatJson(endpoint.buildPayload(ids))}
                      </pre>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => runEndpoint(endpoint)}
                      disabled={result.status === "loading"}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`${endpoint.title} çalıştır`}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyResult(endpoint.key)}
                      disabled={result.data === undefined}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`${endpoint.title} yanıtını kopyala`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4 text-xs">
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="font-semibold uppercase text-slate-500">
                      HTTP
                    </div>
                    <div className="mt-1 font-mono text-slate-900">
                      {result.httpStatus ?? "-"}
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="font-semibold uppercase text-slate-500">
                      Süre
                    </div>
                    <div className="mt-1 font-mono text-slate-900">
                      {typeof result.durationMs === "number"
                        ? `${result.durationMs}ms`
                        : "-"}
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="font-semibold uppercase text-slate-500">
                      Saat
                    </div>
                    <div className="mt-1 font-mono text-slate-900">
                      {result.updatedAt || "-"}
                    </div>
                  </div>
                </div>

                {result.error ? (
                  <div className="mx-4 mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {result.error}
                  </div>
                ) : null}

                <pre className="custom-scrollbar m-4 min-h-[150px] flex-1 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">
                  {result.data !== undefined
                    ? formatJson(result.data)
                    : "Henüz yanıt yok."}
                </pre>

                {copiedKey === endpoint.key ? (
                  <div className="px-4 pb-4 text-xs font-semibold text-emerald-700">
                    Yanıt kopyalandı.
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
