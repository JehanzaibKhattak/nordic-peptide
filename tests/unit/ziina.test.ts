import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const order = { id: "o1", orderNumber: "NPS12345678", totalCents: 5490, currency: "EUR", paymentProvider: "ziina", providerRef: "pi_1", reservedUntil: new Date(Date.now() + 600_000), items: [] };
const dbMock = vi.hoisted(() => ({ order: { findFirst: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { mapZiinaStatus, verifyZiinaSignature, ziinaAdapter } from "@/lib/payments/ziina";

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");
const fetchMock = vi.fn();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ZIINA_API_TOKEN", "tok");
  vi.stubEnv("ZIINA_WEBHOOK_SECRET", "whsec");
  vi.stubEnv("ZIINA_TEST", "1");
  dbMock.order.findFirst.mockResolvedValue(order);
  dbMock.order.update.mockResolvedValue(order);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ziina signature", () => {
  it("accepts the hex HMAC-SHA256 of the raw body and rejects anything else", () => {
    const body = '{"event":"x"}';
    expect(verifyZiinaSignature(body, sign(body, "whsec"), "whsec")).toBe(true);
    expect(verifyZiinaSignature(body, sign(body, "other"), "whsec")).toBe(false);
    expect(verifyZiinaSignature(body + " ", sign(body, "whsec"), "whsec")).toBe(false);
    expect(verifyZiinaSignature(body, null, "whsec")).toBe(false);
  });
});

describe("ziina status mapping", () => {
  it("maps terminal and open states", () => {
    expect(mapZiinaStatus("completed")).toBe("paid");
    expect(mapZiinaStatus("failed")).toBe("failed");
    expect(mapZiinaStatus("canceled")).toBe("failed");
    expect(mapZiinaStatus("pending")).toBe("open");
    expect(mapZiinaStatus("requires_payment_instrument")).toBe("open");
  });
});

describe("ziina createPayment", () => {
  it("creates an intent for the order total with truthful description and stores the intent id", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_new", amount: 5490, currency_code: "EUR", status: "requires_payment_instrument", redirect_url: "https://pay.ziina.com/payment_intent/pi_new" }));
    const fresh = { ...order, paymentProvider: null, providerRef: null };
    const res = await ziinaAdapter.createPayment(fresh as never, { token: "s", expiresAt: new Date() } as never, { returnUrl: "http://x/en/checkout/complete?session=s", webhookUrl: "http://x/api/checkout/webhook/ziina" });
    expect(res).toEqual({ kind: "redirect", url: "https://pay.ziina.com/payment_intent/pi_new" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-v2.ziina.com/api/payment_intent");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ amount: 5490, currency_code: "EUR", success_url: "http://x/en/checkout/complete?session=s", cancel_url: "http://x/en/checkout/pay?session=s", test: true, allow_tips: false });
    expect(sent.message).toContain("NPS12345678");
    expect(init.headers.authorization).toBe("Bearer tok");
    expect(dbMock.order.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { paymentProvider: "ziina", providerRef: "pi_new" } });
  });

  it("reuses an open intent instead of creating a second one", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 5490, currency_code: "EUR", status: "requires_payment_instrument", redirect_url: "https://pay.ziina.com/payment_intent/pi_1" }));
    const res = await ziinaAdapter.createPayment(order as never, { token: "s", expiresAt: new Date() } as never, { returnUrl: "http://x/en/checkout/complete?session=s", webhookUrl: "" });
    expect(res).toEqual({ kind: "redirect", url: "https://pay.ziina.com/payment_intent/pi_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMock.order.update).not.toHaveBeenCalled();
  });
});

describe("ziina webhook", () => {
  const body = JSON.stringify({ event: "payment_intent.status.updated", data: { id: "pi_1", status: "completed" } });
  const req = (sig: string) => new Request("http://x/api/checkout/webhook/ziina", { method: "POST", body, headers: { "x-hmac-signature": sig } });

  it("rejects a bad signature", async () => {
    await expect(ziinaAdapter.handleWebhook(req("deadbeef"))).rejects.toThrow("invalid ziina signature");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks paid only after re-fetching a completed intent with the matching amount", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 5490, currency_code: "EUR", status: "completed" }));
    const r = await ziinaAdapter.handleWebhook(req(sign(body, "whsec")));
    expect(r).toMatchObject({ orderId: "o1", status: "paid", providerRef: "pi_1" });
  });

  it("does not trust the webhook body: API says still pending → ignored", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 5490, currency_code: "EUR", status: "pending" }));
    const r = await ziinaAdapter.handleWebhook(req(sign(body, "whsec")));
    expect(r.orderId).toBe("");
  });

  it("refuses to mark paid when the paid amount differs from the order total", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 100, currency_code: "EUR", status: "completed" }));
    const r = await ziinaAdapter.handleWebhook(req(sign(body, "whsec")));
    expect(r).toMatchObject({ orderId: "o1", status: "failed" });
  });

  it("ignores intents that don't belong to any order", async () => {
    dbMock.order.findFirst.mockResolvedValueOnce(null);
    const r = await ziinaAdapter.handleWebhook(req(sign(body, "whsec")));
    expect(r.orderId).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ziina verifyReturn", () => {
  it("confirms a completed payment on return", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 5490, currency_code: "EUR", status: "completed" }));
    expect(await ziinaAdapter.verifyReturn!(order as never)).toMatchObject({ status: "paid", providerRef: "pi_1" });
  });
  it("returns null while the payment is still open", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "pi_1", amount: 5490, currency_code: "EUR", status: "requires_user_action" }));
    expect(await ziinaAdapter.verifyReturn!(order as never)).toBeNull();
  });
});
