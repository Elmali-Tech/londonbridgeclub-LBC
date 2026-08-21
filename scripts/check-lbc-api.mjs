import fs from "node:fs";

function loadDotEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadDotEnv(".env.local");

const url =
  process.env.LBC_API_WEBHOOK_URL ||
  "https://n8n.alisales.ai/webhook/jnryOeI5SEGbO9vz/webhook/lbc-api";
const token = process.env.LBC_API_TOKEN;
if (!token) throw new Error("LBC_API_TOKEN is required.");

async function call(ep) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ ep }),
  });
  const body = await response.json().catch(() => null);
  return {
    ep,
    success: response.ok && !body?.error,
    httpStatus: response.status,
    durationMs: Date.now() - startedAt,
    rows: Array.isArray(body?.data) ? body.data.length : null,
    error: body?.error?.code || body?.error?.message || null,
  };
}

const endpoints = [
  "members",
  "projects",
  "kpi/dashboard",
  "businesses",
  "subscriptions",
  "payments",
  "auth/login",
];
const results = await Promise.all(endpoints.map(call));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));

if (!results.find((result) => result.ep === "members")?.success) process.exitCode = 1;
if (!results.find((result) => result.ep === "projects")?.success) process.exitCode = 1;
