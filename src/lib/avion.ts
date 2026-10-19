import { z } from "zod";
import { db } from "./db";

export const avionEnabled = () => process.env.NEXT_PUBLIC_AVION_CHECKOUT === "true";

export type AvionPayload = {
  affiliate?: import("./types").Affiliate | null;
  payment_method?: "link" | "bank_transfer";
  order_ref: string;
  currency: string;
  customer: { name: string; phone: string; email: string; country: string };
  delivery: { name: string; phone: string; address: string };
  items: { sku: string; qty: number; unit_price: number }[];
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  channel: string;
  notes: string;
};

const resultSchema = z.object({ ok: z.literal(true), order_number: z.string().regex(/^AV-[A-Z0-9-]+$/), id: z.number().int().positive(), duplicate: z.boolean() });

export class AvionError extends Error {
  constructor(public code: string, public retryable: boolean) { super(code); }
}

/** Stable order_ref makes retries safe even when Avion commits before a timeout. */
export async function sendAvionOrder(payload: AvionPayload) {
  const base = process.env.AVION_API_URL;
  const key = process.env.AVION_API_KEY;
  if (!base || !key) throw new AvionError("avion_not_configured", false);
  let url: URL;
  try { url = new URL(base); } catch { throw new AvionError("avion_invalid_url", false); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new AvionError("avion_invalid_url", false);
  }
  const endpoint = new URL("api/v1/orders", `${url.origin}${url.pathname.replace(/\/$/, "")}/`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "X-Avion-Key": key }, body: JSON.stringify(payload), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (response.status >= 500 || response.status === 429) throw new AvionError("avion_unavailable", true);
      if (response.status !== 200 && response.status !== 201) throw new AvionError(`avion_rejected_${response.status}`, false);
      const data = resultSchema.safeParse(await response.json());
      if (!data.success) throw new AvionError("avion_invalid_response", true);
      return data.data;
    } catch (error) {
      const failure = error instanceof AvionError ? error : new AvionError("avion_unavailable", true);
      if (!failure.retryable || attempt === 2) throw failure;
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw new AvionError("avion_unavailable", true);
}

/** The pending event is durable; an unavailable backend never discards the website order. */
export async function syncAvionOrder(orderId: string) {
  const synced = await db.orderEvent.findFirst({ where: { orderId, type: "avion.synced" } });
  if (synced) return synced.payload as { orderNumber: string };
  const pending = await db.orderEvent.findFirst({ where: { orderId, type: "avion.pending" } });
  if (!pending) throw new AvionError("avion_order_not_queued", false);
  try {
    const result = await sendAvionOrder(pending.payload as unknown as AvionPayload);
    const receipt = { orderNumber: result.order_number };
    await db.orderEvent.create({ data: { orderId, type: "avion.synced", payload: receipt } });
    return receipt;
  } catch (error) {
    const failure = error instanceof AvionError ? error : new AvionError("avion_sync_failed", true);
    await db.orderEvent.create({ data: { orderId, type: failure.retryable ? "avion.retry" : "avion.failed", payload: { code: failure.code } } });
    console.error("Avion synchronization failed", { orderId, code: failure.code });
    return null;
  }
}
