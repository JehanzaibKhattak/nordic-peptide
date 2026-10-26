import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { syncAvionOrder } from "../avion";
import { sendEmail } from "../email";
import { PaymentReceivedEmail } from "../email/templates";
import { argentConfig, argentEnabled } from "./argent-config";
import { argentRequest, argentIntentSchema, assertArgentIntent, argentHostedUrl, argentCents } from "./argent-api";
import type { Address } from "../types";

export async function startArgentPayment(orderId: string, returnUrl: string) {
  const config = argentConfig();
  if (!argentEnabled() || !config) throw new Error("argent_disabled");
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentProvider !== "argent" || order.currency !== "GBP" || !["PENDING", "RESERVED"].includes(order.status) || !order.reservedUntil || order.reservedUntil < new Date()) throw new Error("not_payable");
  if (config.live) {
    const base = new URL(process.env.AVION_API_URL ?? "");
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("argent_backend_not_configured");
    const response = await fetch(new URL("api/v1/payments/argent", `${base.origin}${base.pathname.replace(/\/$/, "")}/`), { headers: { "X-Avion-Key": process.env.AVION_API_KEY ?? "" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6000) });
    const ready = response.ok ? await response.json() : null;
    if (!ready?.configured || ready.companyId !== config.companyId) throw new Error("argent_backend_not_ready");
  }
  const previous = await db.argentPayment.findUnique({ where: { orderId } });
  if (previous) {
    if (previous.live !== config.live) throw new Error("argent_mode_mismatch");
    if (previous.checkoutUrl && previous.status === "draft") return previous.checkoutUrl;
    throw new Error("argent_payment_already_started");
  }
  // The unique order key is a durable claim, committed before the external POST.
  try { await db.argentPayment.create({ data: { orderId, reference: order.orderNumber, live: config.live } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("argent_payment_already_started"); throw error; }
  const billing = order.billingAddress as unknown as Address;
  try {
    const intent = argentIntentSchema.parse(await argentRequest("/payment-intents", "POST", {
      public_key: config.publicKey, amount: Number((order.totalCents / 100).toFixed(2)), currency_code: order.currency,
      reference: order.orderNumber, merchant_initiated: false, can_handle_3ds: true, flow: "hosted", return_url: returnUrl,
      customer: { email: order.email, first_name: billing.firstName, last_name: billing.lastName, billing_address: { line_1: billing.line1, line_2: billing.line2 ?? "", city: billing.city, postal_code: billing.postcode, country_code: billing.country } },
      metadata: { order_id: order.id, order_number: order.orderNumber },
    }));
    assertArgentIntent(intent, order, config.live);
    // Save the ID even if the hosted response contract needs investigation.
    await db.argentPayment.update({ where: { orderId }, data: { intentId: intent.id, status: intent.status } });
    const url = argentHostedUrl(intent);
    await db.argentPayment.update({ where: { orderId }, data: { checkoutUrl: url } });
    return url;
  } catch {
    await db.argentPayment.updateMany({ where: { orderId, intentId: null }, data: { status: "UNKNOWN" } });
    throw new Error("argent_payment_needs_review");
  }
}

/** The back office independently retrieves the same live intent before fulfilment/tracking. */
async function syncArgentBackend(orderId: string, intentId: string, event: "paid" | "refunded") {
  if (!(await syncAvionOrder(orderId))) throw new Error("argent_backend_pending");
  const base = new URL(process.env.AVION_API_URL ?? "");
  const key = process.env.AVION_API_KEY;
  if (!key || base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("argent_backend_not_configured");
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const result = await fetch(new URL("api/v1/payments/argent", `${base.origin}${base.pathname.replace(/\/$/, "")}/`), {
    method: "POST", headers: { "content-type": "application/json", "X-Avion-Key": key },
    body: JSON.stringify({ order_ref: order.orderNumber, intent_id: intentId, event }),
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  if (!result.ok || !(await result.json()).ok) throw new Error("argent_backend_pending");
}

export async function reconcileArgentPayment(orderId: string) {
  const attempt = await db.argentPayment.findUnique({ where: { orderId }, include: { order: { include: { items: true } } } });
  if (!attempt?.intentId) return { status: attempt?.status ?? "NOT_STARTED" };
  const intent = argentIntentSchema.parse(await argentRequest(`/payment-intents/${attempt.intentId}`));
  if (intent.id !== attempt.intentId) throw new Error("argent_intent_mismatch");
  assertArgentIntent(intent, attempt.order, attempt.live);
  if (["EXPIRED", "CANCELLED"].includes(attempt.order.status)) throw new Error("argent_order_needs_review");
  if (intent.status !== "completed") {
    await db.argentPayment.update({ where: { orderId }, data: { status: intent.status } });
    return { status: intent.status };
  }
  const paymentId = typeof intent.payment === "string" ? intent.payment : intent.payment?.id;
  if (!paymentId || (attempt.paymentId && attempt.paymentId !== paymentId)) throw new Error("argent_capture_missing");
  const payment = z.object({ id: z.string(), payment_intent: z.string(), status: z.enum(["paid", "refunded", "partially_refunded"]) }).parse(await argentRequest(`/payments/${paymentId}`));
  if (payment.id !== paymentId || payment.payment_intent !== intent.id) throw new Error("argent_capture_mismatch");
  if (payment.status === "partially_refunded") throw new Error("argent_partial_refund_needs_review");
  const refunded = payment.status === "refunded";
  if (attempt.live) await syncArgentBackend(orderId, intent.id, refunded ? "refunded" : "paid");
  await db.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.paymentProvider !== "argent") throw new Error("argent_provider_mismatch");
    const allowed = refunded ? ["PENDING", "RESERVED", "PAID", "FULFILLED"] : ["PENDING", "RESERVED"];
    const claim = await tx.order.updateMany({ where: { id: orderId, paymentProvider: "argent", status: { in: allowed } }, data: { status: refunded ? "REFUNDED" : "PAID", providerRef: paymentId, reservedUntil: null } });
    await tx.argentPayment.update({ where: { orderId }, data: { paymentId, status: refunded ? "REFUNDED" : "completed", checkoutUrl: null, ...(refunded ? { refundState: "CONFIRMED" } : {}) } });
    if (!claim.count) return;
    await tx.checkoutSession.updateMany({ where: { orderId }, data: { status: refunded ? "EXPIRED" : "USED" } });
    if (refunded && order.status !== "FULFILLED" && !(await tx.orderEvent.findFirst({ where: { orderId, type: "inventory.offline" } }))) for (const item of order.items) await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    await tx.orderEvent.create({ data: { orderId, type: refunded ? "argent.refunded" : "argent.paid", payload: { intentId: intent.id, paymentId, live: attempt.live } } });
    if (!refunded) await tx.orderEvent.create({ data: { id: `argent-email:${orderId}`, orderId, type: "email.pending", payload: { template: "payment_received", live: attempt.live } } });
  });
  const notice = await db.orderEvent.findUnique({ where: { id: `argent-email:${orderId}` } });
  const saved = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!refunded && notice?.type === "email.pending" && ["PAID", "FULFILLED"].includes(saved.status)) {
    try { await sendEmail({ to: saved.email, idempotencyKey: notice.id, subject: `${attempt.live ? "Payment received" : "Test payment recorded"} — ${saved.orderNumber}`, react: PaymentReceivedEmail({ order: saved, orderUrl: `${process.env.STORE_BASE_URL}/${saved.locale}/checkout/argent?session=${(await db.checkoutSession.findFirstOrThrow({ where: { orderId } })).token}` }) });
    await db.orderEvent.update({ where: { id: notice.id }, data: { type: "email.sent" } });
    } catch { /* The durable email.pending record is retried by reconciliation; payment stays confirmed. */ }
  }
  return { status: saved.status };
}

/** Full refunds only. Timeout/unknown outcome remains locked for operator recovery, never POSTed twice. */
export async function refundArgentPayment(orderId: string) {
  const attempt = await db.argentPayment.findUniqueOrThrow({ where: { orderId }, include: { order: true } });
  if (!argentConfig() || argentConfig()!.live !== attempt.live) throw new Error("argent_mode_mismatch");
  if (!attempt.paymentId || !["PAID", "FULFILLED"].includes(attempt.order.status)) throw new Error("argent_not_refundable");
  const claim = await db.argentPayment.updateMany({ where: { orderId, refundState: null }, data: { refundState: "REQUESTING" } });
  if (claim.count) {
    try {
      const refund = z.object({ id: z.string(), amount: z.union([z.number(), z.string()]), payment: z.object({ id: z.string() }) }).parse(await argentRequest("/refunds", "POST", { payment: attempt.paymentId, amount: Number((attempt.order.totalCents / 100).toFixed(2)) }));
      if (refund.payment.id !== attempt.paymentId || argentCents(refund.amount) !== attempt.order.totalCents) throw new Error("argent_refund_mismatch");
      await db.argentPayment.update({ where: { orderId }, data: { refundId: refund.id, refundState: "PENDING" } });
    } catch { await db.argentPayment.update({ where: { orderId }, data: { refundState: "UNKNOWN" } }); throw new Error("argent_refund_needs_review"); }
  }
  return reconcileArgentPayment(orderId);
}

/** Operator recovery only: no public API accepts a replacement intent ID. */
export async function recoverArgentPayment(orderId: string, intentId: string) {
  const attempt = await db.argentPayment.findUniqueOrThrow({ where: { orderId }, include: { order: true } });
  if (attempt.intentId || !["UNKNOWN", "CREATING"].includes(attempt.status)) throw new Error("argent_recovery_not_allowed");
  const intent = argentIntentSchema.parse(await argentRequest(`/payment-intents/${intentId}`));
  if (intent.id !== intentId) throw new Error("argent_intent_mismatch");
  assertArgentIntent(intent, attempt.order, attempt.live);
  await db.argentPayment.update({ where: { orderId }, data: { intentId, status: intent.status } });
  return reconcileArgentPayment(orderId);
}

export async function recoverArgentRefund(orderId: string, refundId: string) {
  const attempt = await db.argentPayment.findUniqueOrThrow({ where: { orderId }, include: { order: true } });
  if (!argentConfig() || argentConfig()!.live !== attempt.live || !attempt.paymentId || attempt.refundState !== "UNKNOWN") throw new Error("argent_recovery_not_allowed");
  const refund = z.object({ id: z.string(), amount: z.union([z.number(), z.string()]), payment: z.object({ id: z.string() }) }).parse(await argentRequest(`/refunds/${refundId}`));
  if (refund.id !== refundId || refund.payment.id !== attempt.paymentId || argentCents(refund.amount) !== attempt.order.totalCents) throw new Error("argent_refund_mismatch");
  await db.argentPayment.update({ where: { orderId }, data: { refundId, refundState: "PENDING" } });
  return reconcileArgentPayment(orderId);
}
