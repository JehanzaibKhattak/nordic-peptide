import Stripe from "stripe";
import type { PaymentAdapter } from "./types";

// Stripe Checkout (hosted page). Enabled when STRIPE_SECRET_KEY is set.
// Webhook: checkout.session.completed → paid; charge.refunded → refunded.

let client: Stripe | null = null;
function stripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export const stripeAdapter: PaymentAdapter = {
  id: "stripe",
  method: "card",
  label: "Card",
  isEnabled: () => Boolean(process.env.STRIPE_SECRET_KEY),

  async createPayment(order, session, ctx) {
    const cs = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.email,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, sessionToken: session.token },
      line_items: [
        ...order.items.map((i) => ({
          quantity: i.qty,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: i.unitCents,
            product_data: { name: `${i.name} — ${i.variantLabel}` },
          },
        })),
        ...(order.shippingCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: order.currency.toLowerCase(),
                  unit_amount: order.shippingCents,
                  product_data: { name: `Shipping (${order.shippingMethod})` },
                },
              },
            ]
          : []),
      ],
      ...(order.discountCents > 0
        ? {
            discounts: [
              {
                coupon: (
                  await stripe().coupons.create({
                    amount_off: order.discountCents,
                    currency: order.currency.toLowerCase(),
                    duration: "once",
                    name: order.couponCode ?? "Discount",
                  })
                ).id,
              },
            ],
          }
        : {}),
      success_url: `${ctx.returnUrl}&provider=stripe`,
      cancel_url: ctx.returnUrl.replace("/checkout/complete", "/checkout/pay"),
      expires_at: Math.floor((order.reservedUntil ?? new Date(Date.now() + 30 * 60_000)).getTime() / 1000),
    });
    if (!cs.url) throw new Error("Stripe did not return a checkout URL");
    return { kind: "redirect", url: cs.url };
  },

  async handleWebhook(req) {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) throw new Error("missing stripe signature/secret");
    const payload = await req.text();
    const event = stripe().webhooks.constructEvent(payload, sig, secret);

    if (event.type === "checkout.session.completed") {
      const cs = event.data.object;
      return {
        orderId: cs.metadata?.orderId ?? cs.client_reference_id ?? "",
        status: cs.payment_status === "paid" ? "paid" : "failed",
        providerRef: typeof cs.payment_intent === "string" ? cs.payment_intent : cs.id,
        raw: event,
      };
    }
    if (event.type === "checkout.session.expired") {
      const cs = event.data.object;
      return { orderId: cs.metadata?.orderId ?? "", status: "expired", providerRef: cs.id, raw: event };
    }
    if (event.type === "charge.refunded") {
      const ch = event.data.object;
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id ?? "";
      return { orderId: ch.metadata?.orderId ?? "", status: "refunded", providerRef: pi, raw: event };
    }
    return { orderId: "", status: "failed", providerRef: event.id, raw: event };
  },

  async refund(order, amountCents) {
    if (!order.providerRef) throw new Error("no payment_intent on order");
    await stripe().refunds.create({ payment_intent: order.providerRef, amount: amountCents });
  },
};
