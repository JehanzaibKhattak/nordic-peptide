import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), upsert: vi.fn(),
  request: vi.fn(), sync: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  argentPayment: { findUnique: mocks.findUnique, update: mocks.update },
  order: { findUniqueOrThrow: mocks.findUniqueOrThrow },
  $transaction: async (fn: (tx: unknown) => unknown) => fn({ argentPayment: { update: mocks.update }, orderEvent: { upsert: mocks.upsert } }),
} }));
vi.mock("@/lib/avion", () => ({ syncAvionOrder: mocks.sync }));
vi.mock("@/lib/payments/argent-config", () => ({ argentConfig: () => ({ companyId: "company-fixture", live: process.env.ARGENT_MODE !== "test" }), argentEnabled: () => true }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/templates", () => ({ PaymentReceivedEmail: vi.fn() }));
vi.mock("@/lib/payments/argent-api", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/payments/argent-api")>(), argentRequest: mocks.request,
}));
import { reconcileArgentPayment } from "@/lib/payments/argent";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ARGENT_MODE", "live");
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "fixture-key");
  const order = { id: "order-fixture", orderNumber: "NPS-FAILURE", currency: "GBP", totalCents: 20900, status: "PENDING", items: [] };
  mocks.findUnique.mockResolvedValue({ intentId: "intent-fixture", live: true, order });
  mocks.findUniqueOrThrow.mockResolvedValue(order);
  mocks.sync.mockResolvedValue(true);
  mocks.request.mockResolvedValue({ id: "intent-fixture", status: "failed", live: true, company: { id: "company-fixture" }, reference: "NPS-FAILURE", currency: { code: "GBP" }, amount: "209.00", payment: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("syncs verified live failure to Avion without changing order payment status", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
  vi.stubGlobal("fetch", fetch);
  await expect(reconcileArgentPayment("order-fixture")).resolves.toEqual({ status: "failed" });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ order_ref: "NPS-FAILURE", intent_id: "intent-fixture", event: "failed" });
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(mocks.upsert).toHaveBeenCalledTimes(1);
});
it("keeps failure visible and retries logging on the next reconciliation", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(new Response('{"ok":true}'));
  vi.stubGlobal("fetch", fetch); vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(reconcileArgentPayment("order-fixture")).resolves.toEqual({ status: "failed" });
  await expect(reconcileArgentPayment("order-fixture")).resolves.toEqual({ status: "failed" });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not send test failures to the live backend", async () => {
  vi.stubEnv("ARGENT_MODE", "test");
  const attempt = await mocks.findUnique(); attempt.live = false;
  const intent = await mocks.request(); intent.live = false;
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await expect(reconcileArgentPayment("order-fixture")).resolves.toEqual({ status: "failed" });
  expect(fetch).not.toHaveBeenCalled();
});
