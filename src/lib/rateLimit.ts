import { createHash } from "crypto";
import { isIP } from "net";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

const buckets = new Map<string, RateLimitEntry>();
const MAX_BUCKETS = 10_000;

function pruneExpired(now: number): void {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

function trustedClientIp(request: Request): string | null {
  const chain = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isIP(value) !== 0);

  // Google Cloud's external load balancer appends the observed client and load
  // balancer addresses to the right. Taking the penultimate value avoids
  // trusting attacker-supplied values at the beginning of the chain.
  if (chain.length >= 2) return chain[chain.length - 2];
  // A single X-Forwarded-For value cannot be distinguished from a
  // client-supplied header here. In that case retain the per-email defense but
  // skip the IP bucket instead of trusting spoofable input or globally
  // throttling every unresolved caller together.
  return null;
}

function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_BUCKETS) pruneExpired(now);
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function consumeAuthRateLimit(
  scope: string,
  request: Request,
  email: string,
  options: {
    windowMs: number;
    emailLimit: number;
    ipLimit: number;
  },
): RateLimitResult {
  const ip = trustedClientIp(request);
  const normalizedEmail = email.trim().toLowerCase();
  const compositeKey = `${scope}:ip-email:${ip ?? "unresolved"}:${emailFingerprint(normalizedEmail)}`;

  const composite = consume(compositeKey, options.emailLimit, options.windowMs);
  const perIp = ip
    ? consume(`${scope}:ip:${ip}`, options.ipLimit, options.windowMs)
    : { allowed: true, retryAfter: 0 };

  return {
    allowed: composite.allowed && perIp.allowed,
    retryAfter: Math.max(composite.retryAfter, perIp.retryAfter),
  };
}

export function clearAuthRateLimit(scope: string, request: Request, email: string): void {
  const ip = trustedClientIp(request);
  buckets.delete(`${scope}:ip-email:${ip ?? "unresolved"}:${emailFingerprint(email)}`);
}
