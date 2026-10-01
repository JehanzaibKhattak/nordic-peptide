import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import type { OrderForPayment, PaymentAdapter, WebhookResult } from "./types";

// Ziina (UAE-licensed PSP) — hosted payment page via Payment Intents.
// Docs: https://docs.ziina.com/api-reference/payment-intent/create
//
// Ziina intents carry no merchant metadata, so the intent id is stored on
// Order.providerRef at creation and used to map webhooks back to the order.
// Status is never trusted from the webhook body alone: it is re-fetched from
// the Ziina API, and the amount/currency must match the order.

// ZIINA_API_BASE is only for pointing at the local fake (/api/dev/ziina) in development.
const apiBase = () => process.env.ZIINA_API_BASE || "https://api-v2.ziina.com/api";

type ZiinaStatus = "requires_payment_instrument" | "requires_user_action" | "pending" | "completed" | "failed" | "canceled";
type ZiinaIntent = {
  id: string;
  amount: number;
  currency_code: string;
  status: ZiinaStatus;
  redirect_url?: string;
  latest_error?: { message?: string; code?: string } | null;
};

const token = () => process.env.ZIINA_API_TOKEN ?? "";
const testMode = () => process.env.ZIINA_TEST === "1";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Ziina ${init?.method ?? "GET"} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

export function getIntent(id: string) {
  return api<ZiinaIntent>(`/payment_intent/${encodeURIComponent(id)}`);
}

/** Hex SHA-256 HMAC of the raw body, sent by Ziina in X-Hmac-Signature. */
export function verifyZiinaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(header.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function mapZiinaStatus(s: ZiinaStatus): WebhookResult["status"] | "open" {
  if (s === "completed") return "paid";
  if (s === "failed" || s === "canceled") return "failed";
  return "open"; // requires_payment_instrument | requires_user_action | pending
}

/** Turn an authoritative intent (fetched from the API) into a result for a known order. */
function resultFor(order: { id: string; totalCents: number; currency: string }, intent: ZiinaIntent): WebhookResult | null {
  const status = mapZiinaStatus(intent.status);
  if (status === "open") return null;
  if (status === "paid" && (intent.amount !== order.totalCents || intent.currency_code.toUpperCase() !== order.currency.toUpperCase())) {
    // Paid, but not for this order's total — never mark paid on a mismatch.
    return { orderId: order.id, status: "failed", providerRef: intent.id, raw: { reason: "amount_mismatch", intent } };
  }
  return { orderId: order.id, status, providerRef: intent.id, raw: intent };
}

export const ziinaAdapter: PaymentAdapter = {
  id: "ziina",
  method: "card",
  label: "Card · Apple Pay · Google Pay",
  isEnabled: () => Boolean(process.env.ZIINA_API_TOKEN),

  async createPayment(order: OrderForPayment, session, ctx) {
    // Reuse an open intent so a second click can't leave an orphaned, payable intent.
    if (order.paymentProvider === "ziina" && order.providerRef) {
      const existing = await getIntent(order.providerRef).catch(() => null);
      if (existing?.redirect_url && mapZiinaStatus(existing.status) === "open" && existing.amount === order.totalCents) {
        return { kind: "redirect", url: existing.redirect_url };
      }
    }

    const brand = process.env.BRAND_NAME ?? "Avion-PEPT";
    const payPage = ctx.returnUrl.replace("/checkout/complete", "/checkout/pay");
    const intent = await api<ZiinaIntent>("/payment_intent", {
      method: "POST",
      body: JSON.stringify({
        amount: order.totalCents, // minor units of order.currency
        currency_code: order.currency,
        message: `${brand} — order ${order.orderNumber}`,
        success_url: ctx.returnUrl,
        cancel_url: payPage,
        failure_url: payPage,
        expiry: String((order.reservedUntil ?? session.expiresAt).getTime()),
        allow_tips: false,
        test: testMode(),
      }),
    });
    if (!intent.redirect_url) throw new Error("Ziina did not return a redirect_url");

    await db.order.update({ where: { id: order.id }, data: { paymentProvider: "ziina", providerRef: intent.id } });
    return { kind: "redirect", url: intent.redirect_url };
  },

  async handleWebhook(req) {
    const raw = await req.text();
    const secret = process.env.ZIINA_WEBHOOK_SECRET ?? "";
    if (secret && !verifyZiinaSignature(raw, req.headers.get("x-hmac-signature"), secret)) {
      throw new Error("invalid ziina signature");
    }
    const body = JSON.parse(raw) as { event?: string; data?: { id?: string; payment_intent_id?: string } };
    const ignored: WebhookResult = { orderId: "", status: "failed", providerRef: "", raw: body };

    if (body.event === "payment_intent.status.updated" && body.data?.id) {
      const order = await db.order.findFirst({ where: { paymentProvider: "ziina", providerRef: body.data.id } });
      if (!order) return ignored;
      const intent = await getIntent(body.data.id); // authoritative status
      return resultFor(order, intent) ?? ignored;
    }
    if (body.event === "refund.status.updated" && body.data?.payment_intent_id) {
      const order = await db.order.findFirst({ where: { paymentProvider: "ziina", providerRef: body.data.payment_intent_id } });
      const status = (body.data as { status?: string }).status;
      if (order && status === "completed") return { orderId: order.id, status: "refunded", providerRef: body.data.payment_intent_id, raw: body };
    }
    return ignored;
  },

  // Called when the customer lands back on /checkout/complete: confirms the
  // payment server-to-server so the order is marked paid even if the webhook
  // is delayed or not configured.
  async verifyReturn(order) {
    if (order.paymentProvider !== "ziina" || !order.providerRef) return null;
    return resultFor(order, await getIntent(order.providerRef));
  },

  async refund(order, amountCents) {
    if (!order.providerRef) throw new Error("no Ziina payment intent on order");
    const r = await api<{ status: string; error?: { message?: string } | null }>("/refund", {
      method: "POST",
      body: JSON.stringify({ id: randomUUID(), payment_intent_id: order.providerRef, amount: amountCents, currency_code: order.currency, test: testMode() }),
    });
    if (r.status === "failed") throw new Error(`Ziina refund failed: ${r.error?.message ?? "unknown"}`);
  },
};
