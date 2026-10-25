import { retaPackDiscount } from "./reta-offer";
import { offlineInventoryEnabled } from "./inventory";
import { guestBankCheckoutEnabled, guestOwnerMatches } from "./guest-checkout";
import { bankTransferConfig } from "./bank-transfer";
import { normalizeAttribution } from "./affiliate/attribution";
import { avionEnabled, syncAvionOrder, type AvionPayload } from "./avion";
import { randomBytes, randomInt } from "node:crypto";
import type { Order, Prisma } from "@prisma/client";
import { db } from "./db";
import { firePostback } from "./affiliate/postback";
import { sendEmail } from "./email";
import {
  BankTransferEmail,
  OrderReservedEmail,
  OrderShippedEmail,
  PaymentReceivedEmail,
  ReservationExpiredEmail,
} from "./email/templates";
import { getSettings } from "./settings";
import type { Address, Affiliate, OrderStatus } from "./types";
import { applyCoupon } from "./coupons";
import { assertEligibility, checkoutRate, trustedAmount } from "./commerce-policy";
import { shippingCost, shippingAllowed } from "@/config/shipping";

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
  campaign?: "reta";
  purchaserId?: string;
  guestCheckoutId?: string;
  checkoutId?: string;
  currency?: string;
  paymentMethod?: "card" | "bank_transfer";
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
  const bank = input.paymentMethod === "bank_transfer" ? bankTransferConfig() : null;
  if (input.paymentMethod === "bank_transfer" && (!avionEnabled() || !bank || bank.currency !== (input.currency ?? "EUR"))) throw new OrderError("bank_transfer_unavailable");
  if (!shippingAllowed(input.shippingAddress.country, input.shippingMethod, input.shippingAddress.postcode)) throw new OrderError("shipping_unavailable");
  if (input.items.length === 0) throw new OrderError("empty_cart");
  if (input.items.length > 30 || new Set(input.items.map(i => i.variantId)).size !== input.items.length || input.items.some(i => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) throw new OrderError("invalid_items");
  const offlineInventory = Boolean(bank && offlineInventoryEnabled());
  const guest = Boolean(input.guestCheckoutId && !input.purchaserId && bank && guestBankCheckoutEnabled() && input.shippingAddress.country === "GB");
  if (!guest) {
    let eligibility;
    try { eligibility = await assertEligibility(input.purchaserId ?? "", input.shippingAddress.country, input.items.map(i => i.variantId)); }
    catch (e) { throw new OrderError(e instanceof Error ? e.message : "not_eligible"); }
    if (input.email.trim().toLowerCase() !== eligibility.purchaser.email) throw new OrderError("email_mismatch");
  }
  const ownsExisting = async (order: Order) => guest
    ? order.purchaserId === null && order.email === input.email.trim().toLowerCase() && guestOwnerMatches((await db.orderEvent.findFirst({ where: { orderId: order.id, type: "guest.owner" } }))?.payload, input.guestCheckoutId)
    : order.purchaserId === input.purchaserId;
  if (input.checkoutId) {
    const existing = await db.checkoutSession.findUnique({ where: { token: input.checkoutId }, include: { order: { include: { items: true, sessions: true } } } });
    if (existing) {
      if (!(await ownsExisting(existing.order))) throw new OrderError("checkout_conflict");
      if (["CANCELLED", "EXPIRED", "REFUNDED"].includes(existing.order.status)) throw new OrderError("checkout_expired");
      if (avionEnabled()) await syncAvionOrder(existing.order.id);
      return { order: existing.order, token: existing.token, payUrl: `${storeBase()}/${existing.order.locale}/checkout/${avionEnabled() ? "received" : "pay"}?session=${existing.token}` };
    }
  }
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
    if (!offlineInventory && v.stock < i.qty) throw new OrderError("insufficient_stock", { variantId: v.id, available: v.stock });
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
  if (input.campaign === "reta" && input.couponCode) throw new OrderError("offer_not_combinable");
  const coupon = await applyCoupon(input.couponCode, baseSubtotal);
  const campaignDiscount = input.campaign === "reta" && bank && currency === "GBP"
    ? lines.reduce((sum, line) => sum + retaPackDiscount(variants.find(v => v.id === line.variantId)!.sku, line.qty, currency, trustedAmount(line.unitCents, rate)), 0)
    : 0;
  const discountCents = campaignDiscount || trustedAmount(coupon.ok ? coupon.discountCents : 0, rate);
  const country = input.shippingAddress.country;
  const shippingCents = trustedAmount(shippingCost(country, input.shippingMethod, baseSubtotal - (campaignDiscount ? Math.round(campaignDiscount / rate) : coupon.ok ? coupon.discountCents : 0)), rate);
  for (const line of lines) {
    line.unitCents = trustedAmount(line.unitCents, rate);
    line.lineCents = line.unitCents * line.qty;
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const taxCents = 0;
  const totalCents = subtotalCents - discountCents + shippingCents;
  trustedAmount(totalCents, 1);
  if (totalCents <= 0) throw new OrderError("invalid_total");
  const reservedUntil = new Date(Date.now() + (bank ? bank.hours * 60 : Math.max(35, Math.min(1440, settings.reservationMinutes))) * 60_000);
  const orderNumber = await generateOrderNumber();

  const address = input.shippingAddress;
  const affiliate = normalizeAttribution(input.affiliate);
  const avionPayload: AvionPayload = {
    payment_method: bank ? "bank_transfer" : "link",
    order_ref: orderNumber, currency,
    customer: { name: `${address.firstName} ${address.lastName}`, phone: address.phone ?? "", email: input.email.trim().toLowerCase(), country: address.country },
    delivery: { name: `${address.firstName} ${address.lastName}`, phone: address.phone ?? "", address: [address.line1, address.line2, address.city, address.postcode, address.country].filter(Boolean).join("\n") },
    items: lines.map((line) => ({ sku: variants.find(v => v.id === line.variantId)!.sku, qty: line.qty, unit_price: line.unitCents / 100 })),
    shipping_amount: shippingCents / 100, discount_amount: discountCents / 100, total_amount: totalCents / 100,
    affiliate, channel: "retail", notes: `Payment method: ${bank ? "Bank Transfer — awaiting payment" : "payment link"}; Shipping service: ${input.shippingMethod}${input.couponCode ? `; coupon: ${input.couponCode}` : ""}`,
  };

  const order = await db.$transaction(async (tx) => {
    if (!guest) await assertEligibility(input.purchaserId ?? "", country, input.items.map(i => i.variantId), tx);
    // Reserve stock atomically.
    if (!offlineInventory) for (const l of lines) {
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
        paymentMethod: bank ? "bank_transfer" : null,
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
        affiliate: affiliate ?? undefined,
        reservedUntil,
        items: { create: lines },
        sessions: { create: { token: input.checkoutId ?? newSessionToken(), expiresAt: reservedUntil } },
        events: {
          create: [
            ...(campaignDiscount ? [{ type: "campaign.reta", payload: { discountCents: campaignDiscount } }] : []),
            ...(offlineInventory ? [{ type: "inventory.offline", payload: {} }] : []),
            ...(guest ? [{ type: "guest.owner", payload: { id: input.guestCheckoutId! } }] : []),
            ...(bank ? [{ type: "bank_transfer.instructions", payload: { ...bank, reference: orderNumber, deadline: reservedUntil.toISOString() } }] : []),
            { type: "order.created", payload: { subtotalCents, shippingCents, discountCents, totalCents } },
            ...(avionEnabled() ? [{ type: "avion.pending", payload: avionPayload as unknown as Prisma.InputJsonObject }] : []),
            ...(affiliate ? [{ type: "affiliate.attached", payload: affiliate as object }] : []),
          ],
        },
      },
      include: { items: true, sessions: true },
    });
  }).catch(async (error) => {
    if (input.checkoutId && error instanceof Error && "code" in error && error.code === "P2002") {
      const existing = await db.checkoutSession.findUnique({ where: { token: input.checkoutId }, include: { order: { include: { items: true, sessions: true } } } });
      if (existing && await ownsExisting(existing.order)) return existing.order;
    }
    throw error;
  });

  const token = order.sessions[0].token;
  if (avionEnabled()) {
    await syncAvionOrder(order.id);
    if (bank) await sendEmail({ to: order.email, subject: `Bank transfer instructions — ${order.orderNumber}`, react: BankTransferEmail({ order, instructions: bank.instructions, deadline: reservedUntil.toISOString() }) })
      .then(() => logEvent(order.id, "email.sent", { template: "bank_transfer" }))
      .catch(() => logEvent(order.id, "email.failed", { template: "bank_transfer" }));
    return { order, token, payUrl: `${storeBase()}/${order.locale}/checkout/received?session=${token}` };
  }
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
  if (await db.orderEvent.findFirst({ where: { orderId, type: "inventory.offline" } })) return;
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
    data: { status: "PAID", paymentMethod: existing.paymentMethod === "bank_transfer" ? "bank_transfer" : "card", paymentProvider: provider, providerRef, reservedUntil: null },
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
    const offline = await tx.orderEvent.findFirst({ where: { orderId, type: "inventory.offline" } });
    if (!offline) for (const item of order.items) await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
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
    // shortcut: bank receipts are reconciled manually; staff must review overdue transfers before releasing stock.
    where: { AND: [{ OR: [{ paymentMethod: null }, { paymentMethod: { not: "bank_transfer" } }] }], status: { in: ["PENDING", "RESERVED"] }, stripeSessionId: null, OR: [{ paymentProvider: null }, { paymentProvider: { not: "stripe" } }], reservedUntil: { lt: new Date() } },
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
