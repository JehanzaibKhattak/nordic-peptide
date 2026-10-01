import type { Order } from "@prisma/client";
import { db } from "../db";
import type { Affiliate } from "../types";

// Server-side Keitaro postback. Fired on PAID (status=sale) and on
// REFUNDED (status=rejected). Retries 3× with backoff; every attempt is
// logged as an OrderEvent so admin can inspect and resend.

export type PostbackStatus = "sale" | "rejected";

export function buildPostbackUrl(order: Order, status: PostbackStatus, payoutCents: number): string | null {
  const base = process.env.KEITARO_POSTBACK_URL;
  const aff = order.affiliate as Affiliate | null;
  if (!base || !aff?.ktSubid) return null;
  const u = new URL(base);
  u.searchParams.set("subid", aff.ktSubid);
  u.searchParams.set("status", status);
  u.searchParams.set("tid", order.orderNumber);
  u.searchParams.set("revenue", (order.totalCents / 100).toFixed(2));
  u.searchParams.set("payout", (payoutCents / 100).toFixed(2));
  if (process.env.KEITARO_POSTBACK_KEY) u.searchParams.set("key", process.env.KEITARO_POSTBACK_KEY);
  return u.toString();
}

export async function firePostback(order: Order, status: PostbackStatus, payoutCents: number) {
  const url = buildPostbackUrl(order, status, payoutCents);
  if (!url) {
    await db.orderEvent.create({
      data: { orderId: order.id, type: "postback.skipped", payload: { status, reason: "no url or subid" } },
    });
    return { ok: false, skipped: true };
  }

  const delays = [0, 1000, 4000];
  let lastError = "";
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
      const body = (await res.text()).slice(0, 500);
      await db.orderEvent.create({
        data: {
          orderId: order.id,
          type: res.ok ? "postback.sent" : "postback.failed",
          payload: { status, url, attempt: attempt + 1, httpStatus: res.status, body },
        },
      });
      if (res.ok) return { ok: true };
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await db.orderEvent.create({
        data: { orderId: order.id, type: "postback.failed", payload: { status, url, attempt: attempt + 1, error: lastError } },
      });
    }
  }
  return { ok: false, error: lastError };
}
