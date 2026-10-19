import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { AvionError, sendAvionOrder, type AvionPayload } from "@/lib/avion";

const payload: AvionPayload = {
  order_ref: "NPS12345678", currency: "EUR",
  customer: { name: "Test Buyer", phone: "+447700900123", email: "test@example.com", country: "GB" },
  delivery: { name: "Test Buyer", phone: "+447700900123", address: "1 Test Road" },
  items: [{ sku: "RET20", qty: 2, unit_price: 20.01 }],
  shipping_amount: 5.9, discount_amount: 4, total_amount: 41.92, channel: "retail", notes: "",
};
const response = (status = 201) => new Response(JSON.stringify({ ok: true, duplicate: status === 200, order_number: "AV-10045", id: 45 }), { status });

beforeEach(() => {
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "test-server-only-key");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Avion server connection", () => {
  it("keeps the API key in a header and preserves the original currency totals", async () => {
    const fetch = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetch);
    await expect(sendAvionOrder(payload)).resolves.toMatchObject({ order_number: "AV-10045" });
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://backend.example.com/api/v1/orders");
    expect(options.headers["X-Avion-Key"]).toBe("test-server-only-key");
    expect(JSON.parse(options.body)).toEqual(payload);
    expect(options.redirect).toBe("error");
  });
  it("retries timeouts and 5xx with exactly the same order reference", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValue(response(200));
    vi.stubGlobal("fetch", fetch);
    await expect(sendAvionOrder(payload)).resolves.toMatchObject({ duplicate: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(call => JSON.parse(call[1].body).order_ref)).toEqual([payload.order_ref, payload.order_ref, payload.order_ref]);
  });
  it("does not retry bad credentials or unknown SKUs and does not expose response bodies", async () => {
    for (const status of [401, 422]) {
      const fetch = vi.fn().mockResolvedValue(new Response("private customer details", { status }));
      vi.stubGlobal("fetch", fetch);
      await expect(sendAvionOrder(payload)).rejects.toEqual(new AvionError(`avion_rejected_${status}`, false));
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects unsafe configured URLs before transmitting the secret", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const url of ["http://external.example.com", "https://user:secret@backend.example.com", "https://backend.example.com?key=secret"]) {
      vi.stubEnv("AVION_API_URL", url);
      await expect(sendAvionOrder(payload)).rejects.toEqual(new AvionError("avion_invalid_url", false));
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
