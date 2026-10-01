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
  const settings = await getSettings();

  const variants = await db.variant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) } },
    include: { product: true },
  });
  if (variants.length !== input.items.length) throw new OrderError("unknown_variant");

  const lines = input.items.map((i) => {
    const v = variants.find((x) => x.id === i.variantId)!;
    if (!v.product.isActive) throw new OrderError("inactive_product");
    if (v.stock < i.qty) throw new OrderError("insufficient_stock", { variantId: v.id, available: v.stock });
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

  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  const coupon = await applyCoupon(input.couponCode, subtotalCents);
  const discountCents = coupon.ok ? coupon.discountCents : 0;
  const country = input.shippingAddress.country;
  const shippingCents = shippingCost(country, input.shippingMethod, subtotalCents - discountCents);
  const taxCents = 0; // TAX_MODE=none; see README for inclusive/exclusive modes
  const totalCents = subtotalCents - discountCents + shippingCents + taxCents;

  const reservedUntil = new Date(Date.now() + settings.reservationMinutes * 60_000);
  const orderNumber = await generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
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
        status: "RESERVED",
        locale: input.locale,
        currency: "EUR",
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
  void sendEmail({ to: order.email, subject: `Complete your order ${order.orderNumber}`, react: OrderReservedEmail({ order, payUrl }) })
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

export async function expireOrder(orderId: string, notify = true) {
  const r = await db.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "RESERVED"] } },
    data: { status: "EXPIRED", reservedUntil: null },
  });
  if (r.count === 0) return null;
  await db.checkoutSession.updateMany({ where: { orderId }, data: { status: "EXPIRED" } });
  await releaseStock(orderId);
  await logEvent(orderId, "order.expired", {});
  const order = (await db.order.findUnique({ where: { id: orderId }, include: { items: true } }))!;
  if (notify) {
    await sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} expired`,
      react: ReservationExpiredEmail({ order, shopUrl: `${storeBase()}/${order.locale}/shop` }),
    }).catch(() => undefined);
  }
  return order;
}

/** Expire any RESERVED orders whose timer has passed. Called lazily on reads; no cron needed in dev. */
export async function expireStaleOrders() {
  const stale = await db.order.findMany({
    where: { status: { in: ["PENDING", "RESERVED"] }, reservedUntil: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of stale) await expireOrder(o.id);
  return stale.length;
}

export async function cancelOrder(orderId: string) {
  const r = await db.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "RESERVED"] } },
    data: { status: "CANCELLED", reservedUntil: null },
  });
  if (r.count === 0) throw new OrderError("invalid_transition");
  await releaseStock(orderId);
  await logEvent(orderId, "order.cancelled", {});
}

export function isTerminal(status: string) {
  return (["PAID", "FULFILLED", "CANCELLED", "REFUNDED", "EXPIRED"] as OrderStatus[]).includes(status as OrderStatus);
}

export type OrderPublic = Pick<
  Order,
  "orderNumber" | "status" | "email" | "totalCents" | "subtotalCents" | "shippingCents" | "discountCents" | "taxCents" | "trackingNo" | "reservedUntil" | "locale"
>;
