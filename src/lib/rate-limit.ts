// In-memory sliding window limiter for dev / single instance. Swap for
// Upstash or Vercel KV before scaling horizontally.

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) for (const k of buckets.keys()) if (!buckets.get(k)?.length) buckets.delete(k);
  return { ok: true, remaining: limit - hits.length };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "local";
}
