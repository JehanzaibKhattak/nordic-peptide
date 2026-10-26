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
import { createOrder, expireOrder, expireStaleOrders, markPaid, markFulfilled, cancelOrder, markRefunded } from "@/lib/orders";
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
    expect((await createOrderRoute(new Request("https://store.example/api/orders", { method: "POST", headers: { origin: "https://store.example", "content-type": "application/json" }, body: JSON.stringify(input) }))).status).toBe(401);
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

describe("durable Avion order intake", () => {
  it("creates one website order and reservation when the client retries the same checkout", async () => {
    vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
    vi.stubEnv("AVION_API_URL", "https://backend.example.com");
    vi.stubEnv("AVION_API_KEY", "test-only-key");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, order_number: "AV-10045", id: 45, duplicate: false }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const request = { ...input, affiliate: { ktSubid: "TEST_CLICK", affId: "publisher1", capturedAt: new Date().toISOString() }, checkoutId: "b5ed5e3a-0e54-4d7e-9bf8-65e64c4e2f58" };
    const first = await createOrder(request);
    const second = await createOrder(request);
    expect(second.order.id).toBe(first.order.id);
    expect(first.payUrl).toContain("/checkout/received?session=");
    expect(await fixture.db.order.count()).toBe(1);
    expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).affiliate).toMatchObject({ ktSubid: "TEST_CLICK", affId: "publisher1" });
    expect((await fixture.db.order.findFirstOrThrow()).affiliate).toMatchObject({ ktSubid: "TEST_CLICK" });
    expect(await fixture.db.orderEvent.count({ where: { type: "avion.synced" } })).toBe(1);
    vi.unstubAllGlobals();
  });
  it("keeps a failed transfer in the database and retries it without creating another order", async () => {
    vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
    vi.stubEnv("AVION_API_URL", "https://backend.example.com");
    vi.stubEnv("AVION_API_KEY", "test-only-key");
    const fetch = vi.fn().mockResolvedValue(new Response("", { status: 503 })); vi.stubGlobal("fetch", fetch);
    const request = { ...input, checkoutId: "fde85d70-4ef7-44bf-a934-a35c74775a3c" };
    const first = await createOrder(request);
    expect(await fixture.db.orderEvent.count({ where: { orderId: first.order.id, type: "avion.pending" } })).toBe(1);
    fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true, order_number: "AV-10046", id: 46, duplicate: true }), { status: 200 }));
    const second = await createOrder(request);
    expect(second.order.id).toBe(first.order.id);
    expect(await fixture.db.order.count()).toBe(1);
    expect(await fixture.db.orderEvent.count({ where: { orderId: first.order.id, type: "avion.synced" } })).toBe(1);
    vi.unstubAllGlobals();
  });
  it("does not let another purchaser reuse the checkout reference", async () => {
    const request = { ...input, checkoutId: "07d65464-55cb-4985-a1d3-9b160733f49d" };
    await createOrder(request);
    await fixture.db.purchaser.create({ data: { id: "other-buyer", email: "other@lab.example", emailVerifiedAt: new Date(), status: "APPROVED", approvedUntil: new Date(Date.now() + 86400000) } });
    await expect(createOrder({ ...request, purchaserId: "other-buyer", email: "other@lab.example" })).rejects.toThrow("checkout_conflict");
  });
});

// Opt-in: uses a separately hosted, disposable Avion database. Never point at production.
it.runIf(Boolean(process.env.AVION_INTEGRATION_URL && process.env.AVION_INTEGRATION_KEY_FILE))("website HTTP order handler hands a GBP order to real Avion intake once", async () => {
  const endpoint = process.env.AVION_INTEGRATION_URL!;
  if (!endpoint.startsWith("http://127.0.0.1:")) throw new Error("Integration test requires a local isolated backend");
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("AVION_API_URL", endpoint);
  vi.stubEnv("AVION_API_KEY", readFileSync(process.env.AVION_INTEGRATION_KEY_FILE!, "utf8").trim());
  await fixture.db.shippingApproval.create({ data: { country: "GB", approved: true } });
  await fixture.db.product.update({ where: { id: "product" }, data: { approvedCountries: ["GB"] } });
  await fixture.db.variant.update({ where: { id: "variant" }, data: { sku: "RET20" } });
  await fixture.db.checkoutCurrency.create({ data: { code: "GBP", eurRate: 0.85, enabled: true } });
  const address = { firstName: "Integration", lastName: "Test", line1: "Test address only", city: "London", postcode: "SW1A 1AA", country: "GB" };
  const body = { ...input, affiliate: { ktSubid: "KT-BRIDGE-20261016", affId: "test-publisher", sub1: "network-test-click", capturedAt: new Date().toISOString() }, shippingAddress: address, billingAddress: address, currency: "GBP", checkoutId: crypto.randomUUID() };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await createOrderRoute(new Request("https://store.example/api/orders", { method: "POST", headers: { origin: "https://store.example", "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, payUrl: expect.stringContaining("/checkout/received?session=") });
  }
  expect(await fixture.db.order.count()).toBe(1);
  expect(await fixture.db.orderEvent.count({ where: { type: "avion.synced" } })).toBe(1);
  const saved = await fixture.db.order.findFirstOrThrow();
  expect(saved.currency).toBe("GBP"); expect(saved.shippingCents).toBe(587); expect(saved.totalCents).toBe(3987);
  expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
});

it("keeps bank transfers unpaid, preserves instructions, and sends the method to Avion once", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "test-key");
  await expect(createOrder({ ...input, paymentMethod: "bank_transfer" })).rejects.toThrow("bank_transfer_unavailable");
  expect(await fixture.db.order.count()).toBe(0);
  vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("BANK_TRANSFER_CURRENCY", "EUR");
  vi.stubEnv("BANK_TRANSFER_INSTRUCTIONS", "Approved test instructions");
  vi.stubEnv("BANK_TRANSFER_DEADLINE_HOURS", "48");
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true, order_number: "AV-10099", id: 99, duplicate: false }), { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  const checkoutId = "e4b04684-d930-4c55-b661-f688bde7f171";
  const result = await createOrder({ ...input, paymentMethod: "bank_transfer", checkoutId });
  expect(result.order.status).toBe("PENDING");
  expect(result.order.paymentMethod).toBe("bank_transfer");
  expect(result.order.paymentProvider).toBeNull();
  expect(result.order.reservedUntil!.getTime() - Date.now()).toBeGreaterThan(47 * 3600000);
  expect(JSON.parse(fetch.mock.calls[0][1].body).payment_method).toBe("bank_transfer");
  const instructions = await fixture.db.orderEvent.findFirstOrThrow({ where: { orderId: result.order.id, type: "bank_transfer.instructions" } });
  expect(instructions.payload).toMatchObject({ reference: result.order.orderNumber, currency: "EUR", instructions: "Approved test instructions" });
  await createOrder({ ...input, paymentMethod: "bank_transfer", checkoutId });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});

it("accepts only enabled GBP guest bank orders, binds retries to the guest, and expires unpaid stock", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("GUEST_BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("BANK_TRANSFER_CURRENCY", "GBP");
  vi.stubEnv("BANK_TRANSFER_INSTRUCTIONS", "Approved test instructions");
  vi.stubEnv("BANK_TRANSFER_DEADLINE_HOURS", "48");
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, order_number: "AV-10099", id: 99, duplicate: false }), { status: 201 })));
  await fixture.db.checkoutCurrency.create({ data: { code: "GBP", eurRate: 0.8472, enabled: true } });
  // Guest launch uses the active catalogue rather than research-account approvals.
  await fixture.db.product.update({ where: { id: "product" }, data: { researchApproved: false } });
  const gb = { ...address, country: "GB", city: "London", postcode: "SW1A 1AA" };
  const request = { ...input, purchaserId: undefined, guestCheckoutId: "private-guest-session", email: "guest@example.test", paymentMethod: "bank_transfer" as const, currency: "GBP", shippingAddress: gb, billingAddress: gb, checkoutId: crypto.randomUUID() };
  const { order } = await createOrder(request);
  expect(order).toMatchObject({ purchaserId: null, status: "PENDING", paymentProvider: null, paymentMethod: "bank_transfer", currency: "GBP" });
  expect((await createOrder(request)).order.id).toBe(order.id);
  await expect(createOrder({ ...request, guestCheckoutId: "different-session" })).rejects.toThrow("checkout_conflict");
  await expect(createOrder({ ...request, guestCheckoutId: undefined, checkoutId: crypto.randomUUID() })).rejects.toThrow("purchaser_approval_required");
  await expect(createOrder({ ...request, paymentMethod: "card", checkoutId: crypto.randomUUID() })).rejects.toThrow("purchaser_approval_required");
  await expect(createOrder({ ...request, currency: "EUR", checkoutId: crypto.randomUUID() })).rejects.toThrow("bank_transfer_unavailable");
  await expect(createOrder({ ...request, items: [{ variantId: "variant", qty: 10 }], checkoutId: crypto.randomUUID() })).rejects.toThrow("insufficient_stock");
  expect(await fixture.db.order.count()).toBe(1);
  const paid = await createOrder({ ...request, checkoutId: crypto.randomUUID() });
  await markPaid(paid.order.id, "manual", "verified-test-receipt");
  expect(await fixture.db.order.findUniqueOrThrow({ where: { id: paid.order.id } })).toMatchObject({ status: "PAID", paymentMethod: "bank_transfer" });
  await fixture.db.order.update({ where: { id: order.id }, data: { reservedUntil: new Date(0) } });
  await expireStaleOrders();
  expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
  await expireOrder(order.id, false);
  expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
  expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(8);
  vi.unstubAllGlobals();
});

it("accepts zero-stock bank orders in offline mode without changing quantities on retries, cancellation or refund", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("NEXT_PUBLIC_INVENTORY_MODE", "offline");
  vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("BANK_TRANSFER_CURRENCY", "EUR");
  vi.stubEnv("BANK_TRANSFER_INSTRUCTIONS", "Test bank instructions");
  vi.stubEnv("BANK_TRANSFER_DEADLINE_HOURS", "48");
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, order_number: "AV-10099", id: 99, duplicate: false }), { status: 201 })));
  await fixture.db.variant.update({ where: { id: "variant" }, data: { stock: 0 } });
  const request = { ...input, paymentMethod: "bank_transfer" as const, checkoutId: crypto.randomUUID() };
  const { order } = await createOrder(request);
  expect(order.status).toBe("PENDING");
  expect((await createOrder(request)).order.id).toBe(order.id);
  expect(await fixture.db.orderEvent.count({ where: { orderId: order.id, type: "inventory.offline" } })).toBe(1);
  // The order snapshot must survive a later switch back to online inventory.
  vi.stubEnv("NEXT_PUBLIC_INVENTORY_MODE", "online");
  await cancelOrder(order.id);
  expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(0);
  vi.stubEnv("NEXT_PUBLIC_INVENTORY_MODE", "offline");
  const second = await createOrder({ ...request, checkoutId: crypto.randomUUID() });
  await fixture.db.order.update({ where: { id: second.order.id }, data: { status: "PAID" } });
  await markRefunded(second.order.id, "admin");
  expect((await fixture.db.variant.findUniqueOrThrow({ where: { id: "variant" } })).stock).toBe(0);
  vi.unstubAllGlobals();
});

it("keeps a checkout receipt on the initiating approved storefront host", async () => {
  vi.stubEnv("STORE_BASE_URL", "https://store.example");
  vi.stubEnv("STORE_ADDITIONAL_ORIGINS", "https://www.store.example");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("LIVE_PAYMENTS_ENABLED", "false");
  const response = await createOrderRoute(new Request("http://localhost:3000/api/orders", { method: "POST", headers: { origin: "https://www.store.example", "content-type": "application/json" }, body: JSON.stringify(input) }));
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.payUrl).toMatch(/^\/en\/checkout\/pay\?session=/);
  expect(new URL(data.payUrl, "https://www.store.example").origin).toBe("https://www.store.example");
});

it.each([[1, 16720], [2, 31350], [3, 43890]])("stores and forwards the approved RETA %i-pen price without trusting browser amounts", async (qty, totalCents) => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("GUEST_BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_INVENTORY_MODE", "offline");
  vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
  vi.stubEnv("BANK_TRANSFER_CURRENCY", "GBP");
  vi.stubEnv("BANK_TRANSFER_INSTRUCTIONS", "Test bank details");
  vi.stubEnv("BANK_TRANSFER_DEADLINE_HOURS", "48");
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "test-key");
  const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, order_number: "AV-TEST", id: 99, duplicate: false }), { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  try {
    await fixture.db.checkoutCurrency.create({ data: { code: "GBP", eurRate: 0.8472, enabled: true } });
    await fixture.db.variant.update({ where: { id: "variant" }, data: { sku: "RET20", priceCents: 24669, stock: 0 } });
    const gb = { ...address, country: "GB", city: "London", postcode: "SW1A 1AA" };
    const request = { ...input, purchaserId: undefined, guestCheckoutId: "test-owner", checkoutId: crypto.randomUUID(), campaign: "reta" as const, currency: "GBP", paymentMethod: "bank_transfer" as const, shippingAddress: gb, billingAddress: gb, items: [{ variantId: "variant", qty }] };
    const { order } = await createOrder(request);
    expect(order.totalCents).toBe(totalCents);
    expect(order.subtotalCents - order.discountCents + order.shippingCents).toBe(totalCents);
    const payload = JSON.parse((fetch.mock.calls as unknown as [string, { body: string }][])[0][1].body);
    expect(payload.total_amount).toBe(totalCents / 100);
    expect(payload.discount_amount).toBe(order.discountCents / 100);
    expect((await createOrder(request)).order.id).toBe(order.id);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(createOrder({ ...request, checkoutId: crypto.randomUUID(), couponCode: "EXTRA" })).rejects.toThrow("offer_not_combinable");
    const normal = await createOrder({ ...request, campaign: undefined, checkoutId: crypto.randomUUID() });
    expect(normal.order.discountCents).toBe(0);
    expect(normal.order.totalCents).toBe(20900 * qty);
    await fixture.db.variant.update({ where: { id: "variant" }, data: { sku: "RET40" } });
    const otherStrength = await createOrder({ ...request, checkoutId: crypto.randomUUID() });
    expect(otherStrength.order.discountCents).toBe(0);
    expect(otherStrength.order.totalCents).toBe(20900 * qty);
  } finally { vi.unstubAllGlobals(); }
});

// Argent calls below use fixtures only; no provider or production database is contacted.
function configureArgent(live = false) {
  for (const [key, value] of Object.entries({ ARGENT_CHECKOUT_ENABLED: "true", ARGENT_CONTRACT_CONFIRMED: "true", ARGENT_MODE: live ? "live" : "test", ARGENT_ALLOW_LIVE: "true", ARGENT_PUBLIC_KEY: "pk_fixture", ARGENT_SECRET_KEY: "sk_fixture", ARGENT_WEBHOOK_SECRET: "webhook_fixture", ARGENT_COMPANY_ID: "company_fixture", ARGENT_HOSTED_ORIGINS: "https://pay.fixture.example", NEXT_PUBLIC_AVION_CHECKOUT: "true", NEXT_PUBLIC_INVENTORY_MODE: "offline", AVION_API_URL: "https://backend.example.com", AVION_API_KEY: "backend_fixture", STORE_BASE_URL: "https://store.example" })) vi.stubEnv(key, value);
  vi.mocked(sendEmail).mockClear();
}
async function argentOrder(live = false) {
  configureArgent(live);
  await fixture.db.checkoutCurrency.create({ data: { code: "GBP", eurRate: 0.8472, enabled: true } });
  await fixture.db.variant.update({ where: { id: "variant" }, data: { sku: "RET20", priceCents: 24669, stock: 0 } });
  const gb = { ...address, country: "GB", city: "London", postcode: "SW1A 1AA" };
  return createOrder({ ...input, purchaserId: undefined, guestCheckoutId: "argent-owner", checkoutId: crypto.randomUUID(), campaign: "reta", currency: "GBP", paymentMethod: "card", shippingAddress: gb, billingAddress: gb });
}
function intentFixture(orderNumber: string, changes: Record<string, unknown> = {}) {
  return { id: "intent_fixture", status: "draft", amount: "313.50", reference: orderNumber, company: { id: "company_fixture" }, currency: { code: "GBP" }, live: false, payment: null, token: "public_continuation_token", hosted_payment_page_url: "https://pay.fixture.example/checkout", ...changes };
}

import { startArgentPayment, reconcileArgentPayment, refundArgentPayment, recoverArgentPayment } from "@/lib/payments/argent";
import { argentEnabled } from "@/lib/payments/argent-config";
import { argentCents, verifyArgentSignature, argentHostedUrl, argentWebhookIntent, argentIntentSchema } from "@/lib/payments/argent-api";
import { createHmac } from "node:crypto";
import { POST as argentWebhook } from "@/app/api/checkout/webhook/argent/route";

it("Argent is disabled by default and needs explicit contract/live configuration", () => {
  expect(argentEnabled()).toBe(false);
  configureArgent(); expect(argentEnabled()).toBe(true);
  vi.stubEnv("ARGENT_CONTRACT_CONFIRMED", "false"); expect(argentEnabled()).toBe(false);
  configureArgent(true); vi.stubEnv("ARGENT_ALLOW_LIVE", "false"); expect(argentEnabled()).toBe(false);
});
it("validates decimal amounts, signed original bytes and provider redirect origins", () => {
  configureArgent();
  expect(argentCents("313.50")).toBe(31350);
  expect(argentCents(313.5)).toBe(31350);
  for (const bad of ["1.001", "1e3", -1, "NaN", "0", "1000000"]) expect(() => argentCents(bad)).toThrow();
  const raw = '{"payment_intent_id":"intent_fixture"}';
  const signature = createHmac("sha256", "webhook_fixture").update(raw).digest("hex");
  expect(() => verifyArgentSignature(raw, signature)).not.toThrow();
  expect(() => verifyArgentSignature(raw + " ", signature)).toThrow("invalid_signature");
  expect(() => verifyArgentSignature(raw, "invalid")).toThrow("invalid_signature");
  expect(argentWebhookIntent(raw)).toBe("intent_fixture");
  expect(argentWebhookIntent('{"status":"paid","orderId":"victim"}')).toBeNull();
  expect(() => argentHostedUrl(argentIntentSchema.parse(intentFixture("TEST", { hosted_payment_page_url: "https://evil.example/" })))).toThrow();
});
it("creates one server-priced hosted intent and keeps test orders out of Avion", async () => {
  const { order } = await argentOrder();
  expect(order).toMatchObject({ totalCents: 31350, paymentProvider: "argent", paymentMethod: "card", purchaserId: null });
  expect(await fixture.db.orderEvent.count({ where: { type: "avion.pending" } })).toBe(0);
  expect(sendEmail).not.toHaveBeenCalled();
  const fetch = vi.fn(async () => Response.json(intentFixture(order.orderNumber))); vi.stubGlobal("fetch", fetch);
  try {
    const results = await Promise.allSettled([startArgentPayment(order.id, "https://store.example/en/checkout/argent"), startArgentPayment(order.id, "https://store.example/en/checkout/argent")]);
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, request] = (fetch.mock.calls as unknown as [string, RequestInit][])[0];
    const payload = JSON.parse(request.body as string);
    expect(payload).toMatchObject({ amount: 313.5, currency_code: "GBP", reference: order.orderNumber, merchant_initiated: false, flow: "hosted" });
    expect(payload).not.toHaveProperty("card_number");
    expect(request.headers).toMatchObject({ authorization: `Basic ${Buffer.from("sk_fixture:").toString("base64")}` });
    const url = await startArgentPayment(order.id, "https://store.example/en/checkout/argent");
    expect(new URL(url).searchParams.get("id")).toBe("intent_fixture");
    expect(url).not.toContain("sk_fixture"); expect(fetch).toHaveBeenCalledTimes(1);
    await expect(cancelOrder(order.id)).rejects.toThrow();
    expect(await expireOrder(order.id)).toBeNull();
  } finally { vi.unstubAllGlobals(); }
});
it("locks ambiguous payment creation and permits only verified operator recovery", async () => {
  const { order } = await argentOrder();
  const fetch = vi.fn().mockRejectedValue(new Error("timeout")); vi.stubGlobal("fetch", fetch);
  try {
    await expect(startArgentPayment(order.id, "https://store.example/return")).rejects.toThrow("argent_payment_needs_review");
    await expect(startArgentPayment(order.id, "https://store.example/return")).rejects.toThrow("argent_payment_already_started");
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockImplementation(async () => Response.json(intentFixture(order.orderNumber, { reference: "wrong" })));
    await expect(recoverArgentPayment(order.id, "intent_fixture")).rejects.toThrow("argent_payment_mismatch");
    fetch.mockImplementation(async () => Response.json(intentFixture(order.orderNumber)));
    await recoverArgentPayment(order.id, "intent_fixture");
    expect((await fixture.db.argentPayment.findUniqueOrThrow({ where: { orderId: order.id } })).intentId).toBe("intent_fixture");
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
  } finally { vi.unstubAllGlobals(); }
});
it.each([{ amount: "0.01" }, { currency: { code: "EUR" } }, { live: true }, { company: { id: "other" } }, { reference: "other" }])("rejects mismatched Argent evidence: %j", async change => {
  const { order } = await argentOrder();
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture" } });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(intentFixture(order.orderNumber, { status: "completed", payment: "payment_fixture", ...change }))));
  try { await expect(reconcileArgentPayment(order.id)).rejects.toThrow("argent_payment_mismatch"); expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING"); }
  finally { vi.unstubAllGlobals(); }
});
it("does not confirm declines, pending payments, or an unrelated capture", async () => {
  const { order } = await argentOrder();
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture" } });
  let status = "pending";
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.includes("/payments/") ? { id: "payment_fixture", payment_intent: "wrong", status: "paid" } : intentFixture(order.orderNumber, { status, payment: "payment_fixture" }))));
  try {
    expect((await reconcileArgentPayment(order.id)).status).toBe("pending"); status = "failed";
    expect((await reconcileArgentPayment(order.id)).status).toBe("failed"); status = "completed";
    await expect(reconcileArgentPayment(order.id)).rejects.toThrow("argent_capture_mismatch");
    expect(sendEmail).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
it("reconciles a signed payment and its duplicate once, with no test fulfilment or postbacks", async () => {
  const { order } = await argentOrder();
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture" } });
  const fetch = vi.fn(async (url: string) => Response.json(url.includes("/payments/") ? { id: "payment_fixture", payment_intent: "intent_fixture", status: "paid" } : intentFixture(order.orderNumber, { status: "completed", payment: "payment_fixture" }))); vi.stubGlobal("fetch", fetch);
  const raw = '{"payment_intent_id":"intent_fixture"}';
  const signature = createHmac("sha256", "webhook_fixture").update(raw).digest("hex");
  try {
    expect((await argentWebhook(new Request("https://store.example/api/checkout/webhook/argent", { method: "POST", body: raw, headers: { "X-ArgentPlatforms-Signature": "wrong" } }))).status).toBe(400);
    for (let i = 0; i < 2; i++) expect((await argentWebhook(new Request("https://store.example/api/checkout/webhook/argent", { method: "POST", body: raw, headers: { "X-ArgentPlatforms-Signature": signature } }))).status).toBe(200);
    expect(await fixture.db.orderEvent.count({ where: { type: "argent.paid" } })).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls.every(call => String(call[0]).startsWith("https://api.argentplatforms.com/"))).toBe(true);
    await expect(markFulfilled(order.id)).rejects.toThrow("test_orders_cannot_be_fulfilled");
    await expect(markPaid(order.id, "manual", "fake")).rejects.toThrow("argent_verification_required");
    await expect(markRefunded(order.id, "admin")).rejects.toThrow("argent_refund_verification_required");
  } finally { vi.unstubAllGlobals(); }
});
it("does not mark refunded until Argent confirms, and never posts an ambiguous refund twice", async () => {
  const { order } = await argentOrder();
  await fixture.db.order.update({ where: { id: order.id }, data: { status: "PAID", providerRef: "payment_fixture" } });
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture", paymentId: "payment_fixture", status: "completed" } });
  let status = "paid";
  const fetch = vi.fn(async (url: string, options?: RequestInit) => { if (options?.method === "POST") throw new Error("timeout"); return Response.json(url.includes("/payments/") ? { id: "payment_fixture", payment_intent: "intent_fixture", status } : intentFixture(order.orderNumber, { status: "completed", payment: "payment_fixture" })); }); vi.stubGlobal("fetch", fetch);
  try {
    await expect(refundArgentPayment(order.id)).rejects.toThrow("argent_refund_needs_review");
    await refundArgentPayment(order.id);
    expect(fetch.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    status = "refunded"; await reconcileArgentPayment(order.id); await reconcileArgentPayment(order.id);
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect(await fixture.db.orderEvent.count({ where: { type: "argent.refunded" } })).toBe(1);
  } finally { vi.unstubAllGlobals(); }
});

it("requires independent live back-office confirmation before marking Argent paid", async () => {
  const calls: string[] = []; let backendAvailable = false; let number = "";
  const fetch = vi.fn(async (url: string | URL) => {
    const path = String(url); calls.push(path);
    if (path.endsWith('/api/v1/orders')) return Response.json({ ok: true, order_number: "AV-ARGENT", id: 99, duplicate: false });
    if (path.endsWith('/api/v1/payments/argent')) return Response.json({ ok: backendAvailable }, { status: backendAvailable ? 200 : 503 });
    if (path.includes('/payments/')) return Response.json({ id: "payment_fixture", payment_intent: "intent_fixture", status: "paid" });
    return Response.json(intentFixture(number, { status: "completed", live: true, payment: "payment_fixture" }));
  }); vi.stubGlobal("fetch", fetch);
  try {
    const { order } = await argentOrder(true); number = order.orderNumber;
    await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: true, intentId: "intent_fixture" } });
    await expect(reconcileArgentPayment(order.id)).rejects.toThrow("argent_backend_pending");
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    backendAvailable = true; await reconcileArgentPayment(order.id); await reconcileArgentPayment(order.id);
    expect((await fixture.db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    expect(calls.some(url => url.endsWith('/api/v1/payments/argent'))).toBe(true);
    expect(await fixture.db.orderEvent.count({ where: { type: "argent.paid" } })).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  } finally { vi.unstubAllGlobals(); }
});
it("retains verified payment when the confirmation email is temporarily unavailable", async () => {
  const { order } = await argentOrder();
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture" } });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.includes("/payments/") ? { id: "payment_fixture", payment_intent: "intent_fixture", status: "paid" } : intentFixture(order.orderNumber, { status: "completed", payment: "payment_fixture" }))));
  vi.mocked(sendEmail).mockRejectedValueOnce(new Error("email outage"));
  try {
    expect((await reconcileArgentPayment(order.id)).status).toBe("PAID");
    expect((await fixture.db.orderEvent.findUniqueOrThrow({ where: { id: `argent-email:${order.id}` } })).type).toBe("email.pending");
    await reconcileArgentPayment(order.id);
    expect((await fixture.db.orderEvent.findUniqueOrThrow({ where: { id: `argent-email:${order.id}` } })).type).toBe("email.sent");
  } finally { vi.unstubAllGlobals(); }
});
it("records a confirmed full refund without another provider POST", async () => {
  const { order } = await argentOrder();
  await fixture.db.order.update({ where: { id: order.id }, data: { status: "PAID", providerRef: "payment_fixture" } });
  await fixture.db.argentPayment.create({ data: { orderId: order.id, reference: order.orderNumber, live: false, intentId: "intent_fixture", paymentId: "payment_fixture", status: "completed" } });
  const fetch = vi.fn(async (url: string, options?: RequestInit) => Response.json(options?.method === "POST" ? { id: "refund_fixture", amount: "313.50", payment: { id: "payment_fixture" } } : url.includes("/payments/") ? { id: "payment_fixture", payment_intent: "intent_fixture", status: "refunded" } : intentFixture(order.orderNumber, { status: "completed", payment: "payment_fixture" }))); vi.stubGlobal("fetch", fetch);
  try {
    expect((await refundArgentPayment(order.id)).status).toBe("REFUNDED");
    await reconcileArgentPayment(order.id);
    expect(fetch.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
    expect((await fixture.db.argentPayment.findUniqueOrThrow({ where: { orderId: order.id } })).refundState).toBe("CONFIRMED");
  } finally { vi.unstubAllGlobals(); }
});
it("checks live back-office readiness before creating a chargeable Argent attempt", async () => {
  let reference = ""; let ready = false;
  const fetch = vi.fn(async (url: string | URL) => {
    const path = String(url);
    if (path.endsWith('/api/v1/orders')) return Response.json({ ok: true, order_number: "AV-READY", id: 99, duplicate: false });
    if (path.endsWith('/api/v1/payments/argent')) return Response.json({ ok: true, configured: ready, companyId: ready ? 'company_fixture' : null });
    return Response.json(intentFixture(reference, { live: true }));
  }); vi.stubGlobal('fetch', fetch);
  try {
    const { order } = await argentOrder(true); reference = order.orderNumber;
    await expect(startArgentPayment(order.id, 'https://store.example/return')).rejects.toThrow('argent_backend_not_ready');
    expect(await fixture.db.argentPayment.count()).toBe(0);
    expect(fetch.mock.calls.some(call => String(call[0]).startsWith('https://api.argentplatforms.com/'))).toBe(false);
    ready = true;
    expect(await startArgentPayment(order.id, 'https://store.example/return')).toContain('https://pay.fixture.example/');
  } finally { vi.unstubAllGlobals(); }
});
