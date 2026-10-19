import type { Affiliate } from "../types";
export const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeAttribution(value: unknown, now = Date.now()): Affiliate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const a = value as Record<string, unknown>;
  const subid = a.ktSubid ?? a.subid ?? a.kt;
  if (typeof subid !== "string" || !/^[A-Za-z0-9_.~-]{1,128}$/.test(subid)) return null;
  const captured = typeof a.capturedAt === "string" ? Date.parse(a.capturedAt) : Number(a.ts);
  if (!Number.isFinite(captured) || captured > now + 300000 || now - captured >= ATTRIBUTION_WINDOW_MS) return null;
  const result: Affiliate = { ktSubid: subid, capturedAt: new Date(captured).toISOString() };
  for (const key of ["affId", "sub1", "sub2", "sub3", "sub4", "sub5", "source", "utm_medium", "utm_campaign"] as const) {
    const v = a[key] ?? (key === "affId" ? a.aff : key === "source" ? a.utm_source : undefined);
    if (typeof v === "string" && v.length <= 200 && !/[\x00-\x1f]/.test(v)) result[key] = v;
  }
  return result;
}
