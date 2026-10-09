import type Stripe from "stripe";
import { sendEmail } from "../email";
import { PaymentReceivedEmail } from "../email/templates";
import { db } from "../db";
import { stripeClient } from "./stripe";

export function verifyStripeEvent(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) throw new Error("Missing signature configuration");
  const event = stripeClient().webhooks.constructEvent(payload, signature, secret);
  if (event.livemode) throw new Error("Live events disabled");
  return event;
}

export async function processStripeEvent(event: Stripe.Event) {
  if (event.livemode) throw new Error("Live events disabled");
  const sessionTypes = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"];
  if (!sessionTypes.includes(event.type) && event.type !== "charge.refunded") return;
  const object = event.data.object;
  const metadata = "metadata" in object ? object.metadata : null;
  const orderId = metadata?.orderId;
  if (!orderId) throw new Error("Missing order mapping");
  await db.$transaction(async tx => {
    if (await tx.paymentEvent.findUnique({ where: { id: event.id } })) return;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.paymentProvider !== "stripe") throw new Error("Provider mismatch");
    let nextStatus: string | undefined;
    let providerRef = order.providerRef;
    let release = false;
    if (sessionTypes.includes(event.type)) {
      const cs = object as Stripe.Checkout.Session;
      if (cs.client_reference_id !== order.id || (order.stripeSessionId && order.stripeSessionId !== cs.id) || cs.amount_total !== order.totalCents || cs.currency !== order.currency.toLowerCase()) throw new Error("Session or amount mismatch");
      if (cs.livemode) throw new Error("Live session disabled");
      await tx.order.update({ where: { id: order.id }, data: { stripeSessionId: cs.id } });
      const pending = ["PENDING", "RESERVED"].includes(order.status);
      if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && cs.payment_status === "paid" && pending) {
        providerRef = typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id ?? null;
        if (!providerRef) throw new Error("Missing payment intent");
        nextStatus = "PAID";
      } else if (pending && (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed")) {
        nextStatus = event.type === "checkout.session.expired" ? "EXPIRED" : "PAYMENT_FAILED";
        release = true;
      }
    } else {
      const charge = object as Stripe.Charge;
      const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (charge.livemode || charge.currency !== order.currency.toLowerCase() || charge.amount !== order.totalCents || !intent || (order.providerRef && order.providerRef !== intent)) throw new Error("Refund mismatch");
      // A refund can arrive before checkout.session.completed.
      if (charge.refunded && charge.amount_refunded === order.totalCents && ["PENDING", "RESERVED", "PAID", "FULFILLED"].includes(order.status)) {
        nextStatus = "REFUNDED"; providerRef = intent; release = true;
      }
    }
    if (nextStatus) {
      await tx.order.update({ where: { id: order.id }, data: { status: nextStatus, providerRef, reservedUntil: null } });
      await tx.checkoutSession.updateMany({ where: { orderId }, data: { status: nextStatus === "PAID" ? "USED" : "EXPIRED" } });
      if (release) for (const item of order.items) await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
      if (nextStatus === "PAID") await tx.orderEvent.create({ data: { id: `stripe-confirmation:${orderId}`, orderId, type: "email.pending", payload: { template: "payment_received" } } });
      await tx.orderEvent.create({ data: { orderId, type: `stripe.${nextStatus.toLowerCase()}`, payload: { eventId: event.id, providerRef } } });
    }
    await tx.paymentEvent.create({ data: { id: event.id, orderId, type: event.type } });
  });
  const notificationId = `stripe-confirmation:${orderId}`;
  const notification = await db.orderEvent.findUnique({ where: { id: notificationId } });
  if (notification?.type === "email.pending") {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (["PAID", "FULFILLED"].includes(order.status)) await sendEmail({
      to: order.email, subject: `Test payment recorded: ${order.orderNumber}`, idempotencyKey: notificationId,
      react: PaymentReceivedEmail({ order, orderUrl: `${process.env.STORE_BASE_URL ?? "http://localhost:3000"}/${order.locale}/order/${order.orderNumber}` }),
    });
    await db.orderEvent.update({ where: { id: notificationId }, data: { type: "email.sent" } });
  }
}

/** Admin recovery uses a server-retrieved Stripe session, never browser claims. */
export async function reconcileStripeSession(session: Stripe.Checkout.Session) {
  if (session.status !== "expired" && session.payment_status !== "paid") return;
  await processStripeEvent({
    id: `reconcile:${session.id}:${session.status}:${session.payment_status}`,
    type: session.status === "expired" ? "checkout.session.expired" : "checkout.session.completed",
    livemode: session.livemode,
    data: { object: session },
  } as Stripe.Event);
}
