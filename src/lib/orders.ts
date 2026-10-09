import { randomBytes, randomInt } from "node:crypto";
import type { Order, Prisma } from "@prisma/client";
import { db } from "./db";
import { firePostback } from "./affiliate/postback";
import { sendEmail } from "./email";
import {
  OrderReservedEmail,
  OrderShippedEmail,
  PaymentReceivedEmail,
  ReservationExpiredEmail,
} from "./email/templates";
import { getSettings } from "./settings";
import type { Address, Affiliate, OrderStatus } from "./types";
import { applyCoupon } from "./coupons";
import { assertEligibility, checkoutRate, trustedAmount } from "./commerce-policy";
import { shippingCost } from "@/config/shipping";

const storeBase = () => process.env.STORE_BASE_URL ?? "http://localhost:3000";

export async function generateOrderNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const n = `NPS${randomInt(10_000_000, 99_999_999)}`;
    if (!(await db.order.findUnique({ where: { orderNumber: n } }))) return n;
  }
  throw new Error("could not allocate order number");
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export type CreateOrderInput = {
  purchaserId: string;
  currency?: string;
  locale: string;
  email: string;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: "standard" | "express";
  couponCode?: string | null;
  affiliate?: Affiliate | null;
  items: { variantId: string; qty: number }[];
};

/** Validates items against live prices/stock, prices the order, creates it RESERVED with a checkout session. */
export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) throw new OrderError("empty_cart");
  if (input.items.length > 30 || new Set(input.items.map(i => i.variantId)).size !== input.items.length || input.items.some(i => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) throw new OrderError("invalid_items");
  let eligibility;
  try { eligibility = await assertEligibility(input.purchaserId, input.shippingAddress.country, input.items.map(i => i.variantId)); }
  catch (e) { throw new OrderError(e instanceof Error ? e.message : "not_eligible"); }
  if (input.email.trim().toLowerCase() !== eligibility.purchaser.email) throw new OrderError("email_mismatch");
  const currency = input.currency ?? "EUR";
  let rate;
  try { rate = await checkoutRate(currency); } catch { throw new OrderError("currency_not_configured"); }
  const settings = await getSettings();

  const variants = await db.variant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) }, isActive: true },
    include: { product: true },
  });
  if (variants.length !== input.items.length) throw new OrderError("unknown_variant");

  const lines = input.items.map((i) => {
    const v = variants.find((x) => x.id === i.variantId)!;
    if (!v.product.isActive) throw new OrderError("inactive_product");
    if (v.stock < i.qty) throw new OrderError("insufficient_stock", { variantId: v.id, available: v.stock });
    if (v.currency !== "EUR") throw new OrderError("invalid_catalog_currency");
    trustedAmount(v.priceCents, rate);
    const images = v.product.images as string[];
    return {
      productId: v.productId,
      variantId: v.id,
      name: (v.product.name as { en: string })[input.locale as "en"] ?? (v.product.name as { en: string }).en,
      variantLabel: v.label,
      image: images[0] ?? null,
      qty: i.qty,
      unitCents: v.priceCents,
      lineCents: v.priceCents * i.qty,
    };
  });

  const baseSubtotal = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const coupon = await applyCoupon(input.couponCode, baseSubtotal);
  const discountCents = trustedAmount(coupon.ok ? coupon.discountCents : 0, rate);
  const country = input.shippingAddress.country;
  const shippingCents = trustedAmount(shippingCost(country, input.shippingMethod, baseSubtotal - (coupon.ok ? coupon.discountCents : 0)), rate);
  for (const line of lines) {
    line.unitCents = trustedAmount(line.unitCents, rate);
    line.lineCents = line.unitCents * line.qty;
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const taxCents = 0;
  const totalCents = subtotalCents - discountCents + shippingCents;
  trustedAmount(totalCents, 1);
  if (totalCents <= 0) throw new OrderError("invalid_total");
  const reservedUntil = new Date(Date.now() + Math.max(35, Math.min(1440, settings.reservationMinutes)) * 60_000);
  const orderNumber = await generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
    await assertEligibility(input.purchaserId, country, input.items.map(i => i.variantId), tx);
    // Reserve stock atomically.
    for (const l of lines) {
      const r = await tx.variant.updateMany({
        where: { id: l.variantId, stock: { gte: l.qty } },
        data: { stock: { decrement: l.qty } },
      });
      if (r.count === 0) throw new OrderError("insufficient_stock", { variantId: l.variantId });
    }
    if (coupon.ok) await tx.coupon.update({ where: { code: coupon.code }, data: { used: { increment: 1 } } });

    return tx.order.create({
      data: {
        orderNumber,
        status: "PENDING",
        purchaserId: input.purchaserId,
        locale: input.locale,
        currency,
        subtotalCents,
        shippingCents,
        discountCents,
        taxCents,
        totalCents,
        email: input.email.trim().toLowerCase(),
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        shippingMethod: input.shippingMethod,
        shippingCountry: country,
        couponCode: coupon.ok ? coupon.code : null,
        affiliate: input.affiliate ?? undefined,
        reservedUntil,
        items: { create: lines },
        sessions: { create: { token: newSessionToken(), expiresAt: reservedUntil } },
        events: {
          create: [
            { type: "order.created", payload: { subtotalCents, shippingCents, discountCents, totalCents } },
            ...(input.affiliate ? [{ type: "affiliate.attached", payload: input.affiliate as object }] : []),
          ],
        },
      },
      include: { items: true, sessions: true },
    });
  });

  const token = order.sessions[0].token;
  const payUrl = `${storeBase()}/${order.locale}/checkout/pay?session=${token}`;
  await sendEmail({ to: order.email, subject: `Complete your order ${order.orderNumber}`, react: OrderReservedEmail({ order, payUrl }) })
    .then(() => logEvent(order.id, "email.sent", { template: "order_reserved" }))
    .catch((e) => logEvent(order.id, "email.failed", { template: "order_reserved", error: String(e) }));

  return { order, token, payUrl };
}

export class OrderError extends Error {
  constructor(
    public code: string,
    public meta?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function logEvent(orderId: string, type: string, payload: Prisma.InputJsonValue) {
  return db.orderEvent.create({ data: { orderId, type, payload } });
}

async function releaseStock(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  for (const i of items) await db.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
}

/**
 * Idempotent: marks PAID once, fires postback + email. Safe to call from
 * webhook retries and from the mock confirm endpoint concurrently.
 */
export async function markPaid(orderId: string, provider: string, providerRef: string) {
  const existing = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (existing.purchaserId) {
    if (provider !== "stripe") throw new OrderError("stripe_confirmation_required");
    await assertEligibility(existing.purchaserId, existing.shippingCountry, existing.items.map(i => i.variantId));
  }
  const claimed = await db.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "RESERVED"] } },
    data: { status: "PAID", paymentMethod: "card", paymentProvider: provider, providerRef, reservedUntil: null },
  });
  if (claimed.count === 0) {
    await logEvent(orderId, "payment.duplicate", { provider, providerRef });
    return db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  }
  await db.checkoutSession.updateMany({ where: { orderId }, data: { status: "USED" } });
  await logEvent(orderId, "payment.paid", { provider, providerRef });

  const order = (await db.order.findUnique({ where: { id: orderId }, include: { items: true } }))!;
  const settings = await getSettings();

  await Promise.allSettled([
    firePostback(order, "sale", settings.affiliatePayoutCents),
    sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} confirmed`,
      react: PaymentReceivedEmail({ order, orderUrl: `${storeBase()}/${order.locale}/order/${order.orderNumber}` }),
    })
      .then(() => logEvent(order.id, "email.sent", { template: "payment_received" }))
      .catch((e) => logEvent(order.id, "email.failed", { template: "payment_received", error: String(e) })),
  ]);
  return order;
}

export async function markFulfilled(orderId: string, trackingNo?: string) {
  const existing = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (existing.paymentProvider === "stripe") throw new OrderError("test_orders_cannot_be_fulfilled");
  if (existing.purchaserId) await assertEligibility(existing.purchaserId, existing.shippingCountry, existing.items.map(i => i.variantId));
  const r = await db.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "FULFILLED", trackingNo: trackingNo ?? null },
  });
  if (r.count === 0) throw new OrderError("invalid_transition");
  await logEvent(orderId, "order.fulfilled", { trackingNo: trackingNo ?? null });
  const order = (await db.order.findUnique({ where: { id: orderId }, include: { items: true } }))!;
  await sendEmail({ to: order.email, subject: `Order ${order.orderNumber} has shipped`, react: OrderShippedEmail({ order }) })
    .then(() => logEvent(order.id, "email.sent", { template: "order_shipped" }))
    .catch((e) => logEvent(order.id, "email.failed", { template: "order_shipped", error: String(e) }));
  return order;
}

export async function markRefunded(orderId: string, source: "admin" | "webhook", providerRef?: string) {
  const r = await db.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "FULFILLED"] } },
    data: { status: "REFUNDED" },
  });
  if (r.count === 0) throw new OrderError("invalid_transition");
  await logEvent(orderId, "order.refunded", { source, providerRef: providerRef ?? null });
  await releaseStock(orderId);
  const order = (await db.order.findUnique({ where: { id: orderId } }))!;
  const settings = await getSettings();
  await firePostback(order, "rejected", settings.affiliatePayoutCents);
  return order;
}

async function closeUnpaidOrder(orderId: string, status: "EXPIRED" | "CANCELLED") {
  return db.$transaction(async tx => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "RESERVED"] }, OR: [{ paymentProvider: null }, { paymentProvider: { not: "stripe" } }] },
      data: { status, reservedUntil: null },
    });
    if (!claimed.count) return null;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    await tx.checkoutSession.updateMany({ where: { orderId }, data: { status: "EXPIRED" } });
    await tx.orderEvent.create({ data: { orderId, type: `order.${status.toLowerCase()}`, payload: {} } });
    return order;
  });
}

export async function expireOrder(orderId: string, notify = true) {
  const order = await closeUnpaidOrder(orderId, "EXPIRED");
  if (order && notify) await sendEmail({
    to: order.email, subject: `Order ${order.orderNumber} expired`,
    react: ReservationExpiredEmail({ order, shopUrl: `${storeBase()}/${order.locale}/shop` }),
  }).catch(() => undefined);
  return order;
}

/** Expire any RESERVED orders whose timer has passed. Called lazily on reads; no cron needed in dev. */
export async function expireStaleOrders() {
  const stale = await db.order.findMany({
    where: { status: { in: ["PENDING", "RESERVED"] }, stripeSessionId: null, OR: [{ paymentProvider: null }, { paymentProvider: { not: "stripe" } }], reservedUntil: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of stale) await expireOrder(o.id);
  return stale.length;
}

export async function cancelOrder(orderId: string) {
  if (!(await closeUnpaidOrder(orderId, "CANCELLED"))) throw new OrderError("invalid_transition_or_active_stripe_session");
}

export function isTerminal(status: string) {
  return (["PAID", "FULFILLED", "CANCELLED", "REFUNDED", "EXPIRED", "PAYMENT_FAILED"] as OrderStatus[]).includes(status as OrderStatus);
}

export type OrderPublic = Pick<
  Order,
  "orderNumber" | "status" | "email" | "totalCents" | "subtotalCents" | "shippingCents" | "discountCents" | "taxCents" | "trackingNo" | "reservedUntil" | "locale"
>;
