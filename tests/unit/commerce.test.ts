import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const fixture = vi.hoisted(() => ({ db: null as unknown as PrismaClient, purchaserId: "buyer" as string | null }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
vi.mock("@/lib/purchaser-session", () => ({ currentPurchaser: async () => fixture.purchaserId ? fixture.db.purchaser.findUnique({ where: { id: fixture.purchaserId } }) : null }));
vi.mock("@/lib/deployment-mode", () => ({ BROWSE_ONLY: false }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue({ id: "test" }) }));
vi.mock("@/lib/affiliate/postback", () => ({ firePostback: vi.fn().mockResolvedValue(null) }));
import { NextRequest } from "next/server";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { GET as sessionRoute } from "@/app/api/checkout/session/route";
import { GET as statusRoute } from "@/app/api/orders/by-number/[orderNumber]/route";
import { sendEmail } from "@/lib/email";
import { stripeAdapter } from "@/lib/payments/stripe";
import { createOrder, expireOrder } from "@/lib/orders";
import { assertEligibility, purchaserApproved, productApproved, stripeTestEnabled, trustedAmount } from "@/lib/commerce-policy";
import { processStripeEvent, verifyStripeEvent } from "@/lib/payments/stripe-webhook";

const directory = mkdtempSync(join(tmpdir(), "avion-commerce-"));
const url = `file:${join(directory, "test.db")}`;
const address = { firstName: "Research", lastName: "Buyer", line1: "Lab 1", city: "Madrid", postcode: "28001", country: "ES" };
const input = { purchaserId: "buyer", email: "buyer@lab.example", locale: "en", shippingAddress: address, billingAddress: address, shippingMethod: "standard" as const, items: [{ variantId: "variant", qty: 2 }] };

beforeAll(async () => {
  writeFileSync(join(directory, "test.db"), "");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  fixture.db = new PrismaClient({ datasourceUrl: url });
});
afterAll(async () => { await fixture.db?.$disconnect(); rmSync(directory, { recursive: true, force: true }); });
beforeEach(async () => {
  fixture.purchaserId = "buyer";
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await fixture.db.$transaction([
    fixture.db.paymentEvent.deleteMany(), fixture.db.orderEvent.deleteMany(), fixture.db.checkoutSession.deleteMany(),
    fixture.db.orderItem.deleteMany(), fixture.db.order.deleteMany(), fixture.db.variant.deleteMany(),
    fixture.db.product.deleteMany(), fixture.db.category.deleteMany(), fixture.db.purchaser.deleteMany(),
    fixture.db.shippingApproval.deleteMany(), fixture.db.checkoutCurrency.deleteMany(), fixture.db.coupon.deleteMany(),
  ]);
  await fixture.db.purchaser.create({ data: { id: "buyer", email: input.email, emailVerifiedAt: new Date(), status: "APPROVED", approvedUntil: new Date(Date.now() + 86400000) } });
  await fixture.db.shippingApproval.create({ data: { country: "ES", approved: true } });
  await fixture.db.category.create({ data: { id: "category", slug: "research", name: { en: "Research" } } });
  await fixture.db.product.create({ data: { id: "product", slug: "sample", sku: "SAMPLE", name: { en: "Sample" }, shortDescription: {}, description: {}, categoryId: "category", form: "SERUM", specs: {}, images: [], relatedIds: [], faqs: {}, researchApproved: true, approvedCountries: ["ES"], variants: { create: { id: "variant", label: "Sample", sizeMl: 1, priceCents: 2000, currency: "EUR", stock: 10, sku: "SAMPLE-1" } } } });
});

async function order() {
  const { order } = await createOrder(input);
  return fixture.db.order.update({ where: { id: order.id }, data: { paymentProvider: "stripe", stripeSessionId: "cs_test_1" } });
}
function event(order: { id: string; totalCents: number; currency: string }, type = "checkout.session.completed", id = "evt_1", overrides = {}) {
  return { id, type, livemode: false, data: { object: { id: "cs_test_1", livemode: false, metadata: { orderId: order.id }, client_reference_id: order.id, amount_total: order.totalCents, currency: order.currency.toLowerCase(), payment_status: "paid", payment_intent: "pi_test_1", ...overrides } } } as unknown as Stripe.Event;
}

describe("approval and trusted order boundary", () => {
  it("keeps local and deployment schema models in sync", () => {
    const local = readFileSync("prisma/schema.prisma", "utf8");
    const postgres = readFileSync("prisma/schema.postgresql.prisma", "utf8").split("\n").slice(1).join("\n");
    expect(postgres).toBe(local.replace('provider = "sqlite"', 'provider = "postgresql"'));
  });
  it("defaults new product approvals to denied with readable JSON", async () => {
    const source = await fixture.db.product.findUniqueOrThrow({ where: { id: "product" } });
    const p = await fixture.db.product.create({ data: { id: "unapproved", sku: "NEW", slug: "new", name: source.name!, shortDescription: {}, description: {}, categoryId: source.categoryId, form: source.form, specs: {}, images: [], relatedIds: [], faqs: {} } });
    expect(p.researchApproved).toBe(false);
    expect(productApproved(p, "ES")).toBe(false);
  });
  it("creates a pending order from database prices, reserves stock, and ignores submitted prices", async () => {
    const result = await createOrder({ ...input, items: [{ variantId: "variant", qty: 2, unitCents: 1 } as typeof input.items[number]] });
    expect(result.order.status).toBe("PENDING");
    expect(result.order.subtotalCents).toBe(4000);
    expect(result.order.totalCents).toBe(4590);
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
  });
  it.each(["PENDING", "REJECTED", "UNSUBMITTED"])("blocks %s purchasers", async status => {
    await fixture.db.purchaser.update({ where: { id: "buyer" }, data: { status } });
    await expect(createOrder(input)).rejects.toThrow("purchaser_approval_required");
    expect(await fixture.db.order.count()).toBe(0);
  });
  it("requires email verification and unexpired approval", () => {
    expect(purchaserApproved({ status: "APPROVED", emailVerifiedAt: null, approvedUntil: new Date(Date.now() + 1000) })).toBe(false);
    expect(purchaserApproved({ status: "APPROVED", emailVerifiedAt: new Date(), approvedUntil: new Date(0) })).toBe(false);
  });
  it("blocks unapproved products and destinations, including ROW fallback", async () => {
    await expect(createOrder({ ...input, shippingAddress: { ...address, country: "ZZ" } })).rejects.toThrow("destination_not_approved");
    await fixture.db.product.update({ where: { id: "product" }, data: { researchApproved: false } });
    await expect(createOrder(input)).rejects.toThrow("product_not_approved");
    expect(productApproved({ isActive: true, researchApproved: true, approvedCountries: ["GB"] }, "ES")).toBe(false);
  });
  it("rejects duplicate, negative and over-limit quantities and mismatched email", async () => {
    for (const qty of [-1, 0, 1.5, 11]) await expect(createOrder({ ...input, items: [{ variantId: "variant", qty }] })).rejects.toThrow("invalid_items");
    await expect(createOrder({ ...input, items: [...input.items, ...input.items] })).rejects.toThrow("invalid_items");
    await expect(createOrder({ ...input, email: "other@lab.example" })).rejects.toThrow("email_mismatch");
  });
  it("supports configured currency rates and fails closed for unconfigured currencies", async () => {
    await expect(createOrder({ ...input, currency: "GBP" })).rejects.toThrow("currency_not_configured");
    await fixture.db.checkoutCurrency.create({ data: { code: "GBP", eurRate: 0.85, enabled: true } });
    const { order } = await createOrder({ ...input, currency: "GBP" });
    expect(order.currency).toBe("GBP"); expect(order.items[0].unitCents).toBe(1700); expect(order.totalCents).toBe(3902);
    expect(() => trustedAmount(-1, 1)).toThrow();
    expect(() => trustedAmount(Number.MAX_SAFE_INTEGER, 2)).toThrow();
  });
  it("rechecks approvals at payment time", async () => {
    await createOrder(input);
    await fixture.db.shippingApproval.update({ where: { country: "ES" }, data: { approved: false } });
    await expect(assertEligibility("buyer", "ES", ["variant"])).rejects.toThrow("destination_not_approved");
  });
  it("never enables live keys or a live-payment flag", () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true"); vi.stubEnv("LIVE_PAYMENTS_ENABLED", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_bad"); expect(stripeTestEnabled()).toBe(false);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); expect(stripeTestEnabled()).toBe(true);
    vi.stubEnv("LIVE_PAYMENTS_ENABLED", "true"); expect(stripeTestEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("Stripe webhook integrity and idempotency", () => {
  it("retries failed confirmation email without repeating the payment transition", async () => {
    const o = await order();
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("email unavailable"));
    await expect(processStripeEvent(event(o))).rejects.toThrow("email unavailable");
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
    await processStripeEvent(event(o));
    expect(await fixture.db.orderEvent.count({ where: { type: "stripe.paid" } })).toBe(1);
    expect((await fixture.db.orderEvent.findUniqueOrThrow({ where: { id: `stripe-confirmation:${o.id}` } })).type).toBe("email.sent");
  });
  it("verifies raw signed payloads and rejects tampering and live events", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const stripe = new Stripe("sk_test_example");
    const payload = JSON.stringify({ id: "evt_signed", livemode: false, type: "checkout.session.completed", data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
    expect(verifyStripeEvent(payload, signature).id).toBe("evt_signed");
    expect(() => verifyStripeEvent(payload + " ", signature)).toThrow();
    expect(() => verifyStripeEvent(payload, null)).toThrow();
    const live = payload.replace('"livemode":false', '"livemode":true');
    expect(() => verifyStripeEvent(live, stripe.webhooks.generateTestHeaderString({ payload: live, secret: "whsec_test" }))).toThrow("Live events disabled");
    vi.unstubAllEnvs();
  });
  it("marks paid once across duplicate IDs and separate events, without releasing stock", async () => {
    const o = await order(); const e = event(o);
    await processStripeEvent(e); await processStripeEvent(e); await processStripeEvent(event(o, "checkout.session.completed", "evt_2"));
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
    expect(await fixture.db.orderEvent.count({ where: { type: "stripe.paid" } })).toBe(1);
    expect(await fixture.db.paymentEvent.count()).toBe(2);
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
  });
  it("rejects wrong amount, currency and session without recording the event", async () => {
    const o = await order();
    for (const bad of [{ amount_total: 1 }, { currency: "usd" }, { id: "cs_other" }, { client_reference_id: "other" }]) await expect(processStripeEvent(event(o, undefined, undefined, bad))).rejects.toThrow();
    expect(await fixture.db.paymentEvent.count()).toBe(0);
  });
  it("does not mark an unpaid completion paid; accepts subsequent async success", async () => {
    const o = await order(); await processStripeEvent(event(o, undefined, "evt_unpaid", { payment_status: "unpaid" }));
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
    await processStripeEvent(event(o, "checkout.session.async_payment_succeeded", "evt_paid"));
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
  });
  it("releases stock exactly once on expiry and ignores expiry after payment", async () => {
    const o = await order(); await expireOrder(o.id, false);
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
    await processStripeEvent(event(o, "checkout.session.expired")); await processStripeEvent(event(o, "checkout.session.expired", "evt_expired2"));
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(10);
  });
  it("never downgrades paid orders on late failure or expiry", async () => {
    const o = await order(); await processStripeEvent(event(o));
    await processStripeEvent(event(o, "checkout.session.expired", "evt_late"));
    await processStripeEvent(event(o, "checkout.session.async_payment_failed", "evt_failure"));
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
  });
  it("records payment failure and releases inventory", async () => {
    const o = await order(); await processStripeEvent(event(o, "checkout.session.async_payment_failed"));
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAYMENT_FAILED");
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(10);
  });
  it("handles refunds arriving before completion and repeated refunds without restocking twice", async () => {
    const o = await order();
    const refund = { id: "evt_refund", type: "charge.refunded", livemode: false, data: { object: { metadata: { orderId: o.id }, payment_intent: "pi_test_1", amount: o.totalCents, currency: "eur", refunded: true, amount_refunded: o.totalCents, livemode: false } } } as unknown as Stripe.Event;
    await processStripeEvent(refund); await processStripeEvent(event(o)); await processStripeEvent({ ...refund, id: "evt_refund2" });
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(10);
  });
});


describe("session creation and ownership", () => {
  it("reuses one hosted session, stable idempotency key and server-priced amounts", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("LIVE_PAYMENTS_ENABLED", "false");
    const sdk = new Stripe("sk_test_example");
    const create = vi.spyOn(Object.getPrototypeOf(sdk.checkout.sessions), "create").mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/test", livemode: false });
    const { order: o } = await createOrder(input);
    const context = { returnUrl: "https://store.example/en/checkout/complete?session=token", webhookUrl: "https://store.example/api/checkout/webhook/stripe" };
    const first = await stripeAdapter.createPayment(o, o.sessions[0], context);
    const stored = await fixture.db.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true } });
    expect(await stripeAdapter.createPayment(stored, o.sessions[0], context)).toEqual(first);
    expect(create).toHaveBeenCalledTimes(1);
    const [payload, options] = create.mock.calls[0];
    expect(options).toMatchObject({ idempotencyKey: `checkout:${o.id}` });
    expect(payload).toMatchObject({
      line_items: [{ price_data: { unit_amount: 2000 } }, { price_data: { unit_amount: 590 } }],
      adaptive_pricing: { enabled: false },
      payment_intent_data: { metadata: { orderId: o.id } },
    });
    expect(payload).not.toHaveProperty("metadata.sessionToken");
  });
  it("does not return a saved checkout URL after approval revocation", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("LIVE_PAYMENTS_ENABLED", "false");
    const { order: o } = await createOrder(input);
    await fixture.db.purchaser.update({ where: { id: "buyer" }, data: { status: "REJECTED" } });
    await expect(stripeAdapter.createPayment({ ...o, stripeCheckoutUrl: "https://checkout.stripe.com/test" }, o.sessions[0], { returnUrl: "", webhookUrl: "" })).rejects.toThrow("purchaser_approval_required");
  });
  it("requires authentication and same-origin order submission", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("LIVE_PAYMENTS_ENABLED", "false");
    fixture.purchaserId = null;
    expect((await createOrderRoute(new Request("https://store.example/api/orders", { method: "POST", headers: { origin: "https://evil.example" } }))).status).toBe(403);
    expect((await createOrderRoute(new Request("https://store.example/api/orders", { method: "POST", headers: { origin: "https://store.example" } }))).status).toBe(401);
  });
  it("does not reveal order data or payment tokens to other purchasers", async () => {
    const { order: o, token } = await createOrder(input);
    await fixture.db.purchaser.create({ data: { id: "other", email: "other@example.com" } });
    fixture.purchaserId = "other";
    const response = await sessionRoute(new NextRequest(`https://store.example/api/checkout/session?token=${token}`));
    expect(response.status).toBe(404);
    const status = await statusRoute(new Request("https://store.example"), { params: Promise.resolve({ orderNumber: o.orderNumber }) });
    expect(status.status).toBe(404);
    fixture.purchaserId = "buyer";
    expect((await sessionRoute(new NextRequest(`https://store.example/api/checkout/session?token=${token}`))).status).toBe(200);
  });
});
