import Stripe from "stripe";
import { db } from "../db";
import { assertEligibility, stripeTestEnabled } from "../commerce-policy";
import type { PaymentAdapter } from "./types";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("Stripe test key required");
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
}

export const stripeAdapter: PaymentAdapter = {
  id: "stripe", method: "card", label: "Stripe Checkout (test mode)", isEnabled: stripeTestEnabled,
  async createPayment(order, session, ctx) {
    if (!stripeTestEnabled() || !order.purchaserId) throw new Error("checkout_disabled");
    await assertEligibility(order.purchaserId, order.shippingCountry, order.items.map(i => i.variantId));
    if (order.stripeCheckoutUrl) return { kind: "redirect", url: order.stripeCheckoutUrl };
    const client = stripeClient();
    const expiresAt = Math.floor(session.expiresAt.getTime() / 1000);
    if (expiresAt < Math.floor(Date.now() / 1000) + 30 * 60) throw new Error("reservation_too_short");
    const claim = await db.$transaction(async tx => {
      const { purchaser } = await assertEligibility(order.purchaserId!, order.shippingCountry, order.items.map(i => i.variantId), tx);
      if (!purchaser.approvedUntil || purchaser.approvedUntil < session.expiresAt) throw new Error("approval_expires_before_checkout");
      return tx.order.updateMany({ where: { id: order.id, status: { in: ["PENDING", "RESERVED"] }, OR: [{ paymentProvider: null }, { paymentProvider: "stripe" }] }, data: { paymentProvider: "stripe", paymentMethod: "card" } });
    }, { isolationLevel: "Serializable" });
    if (!claim.count) throw new Error("not_payable");
    const metadata = { orderId: order.id, orderNumber: order.orderNumber };
    const coupon = order.discountCents > 0 ? await client.coupons.create({ amount_off: order.discountCents, currency: order.currency.toLowerCase(), duration: "once", name: order.couponCode ?? "Discount" }, { idempotencyKey: `order-coupon:${order.id}` }) : null;
    const cs = await client.checkout.sessions.create({
      mode: "payment", allowed_payment_method_types: ["card"], adaptive_pricing: { enabled: false },
      locale: ["en", "es", "de", "nl"].includes(order.locale) ? order.locale as "en" | "es" | "de" | "nl" : "en",
      client_reference_id: order.id, customer_email: order.email, metadata,
      payment_intent_data: { metadata },
      line_items: [
        ...order.items.map(i => ({ quantity: i.qty, price_data: { currency: order.currency.toLowerCase(), unit_amount: i.unitCents, product_data: { name: `${i.name} — ${i.variantLabel}` } } })),
        ...(order.shippingCents > 0 ? [{ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.shippingCents, product_data: { name: `Shipping (${order.shippingMethod})` } } }] : []),
      ],
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      success_url: ctx.returnUrl.replace("/checkout/complete", "/checkout/success"),
      cancel_url: ctx.returnUrl.replace("/checkout/complete", "/checkout/cancel"),
      expires_at: expiresAt,
    }, { idempotencyKey: `checkout:${order.id}` });
    if (cs.livemode || !cs.url) throw new Error("Invalid Stripe test session");
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: cs.id, stripeCheckoutUrl: cs.url } });
    return { kind: "redirect", url: cs.url };
  },
  async handleWebhook() { throw new Error("Use transactional Stripe webhook handler"); },
  async refund(order, amountCents) {
    if (!order.providerRef || amountCents !== order.totalCents) throw new Error("Full refund requires a payment intent");
    await stripeClient().refunds.create({ payment_intent: order.providerRef, amount: amountCents }, { idempotencyKey: `refund:${order.id}:full` });
  },
};
