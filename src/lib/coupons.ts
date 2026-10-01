import { db } from "./db";

export type CouponResult =
  | { ok: true; code: string; discountCents: number }
  | { ok: false; reason: "not_found" | "inactive" | "min_not_met" | "exhausted" };

export async function applyCoupon(code: string | null | undefined, subtotalCents: number): Promise<CouponResult> {
  if (!code) return { ok: false, reason: "not_found" };
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!c) return { ok: false, reason: "not_found" };
  if (!c.active) return { ok: false, reason: "inactive" };
  if (c.usageLimit !== null && c.used >= c.usageLimit) return { ok: false, reason: "exhausted" };
  if (subtotalCents < c.minCents) return { ok: false, reason: "min_not_met" };
  const discountCents =
    c.type === "PERCENT" ? Math.round((subtotalCents * c.value) / 100) : Math.min(c.value, subtotalCents);
  return { ok: true, code: c.code, discountCents };
}
