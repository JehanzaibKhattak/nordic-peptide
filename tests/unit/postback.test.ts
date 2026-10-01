import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
import { buildPostbackUrl } from "@/lib/affiliate/postback";

const order = (affiliate: unknown) =>
  ({ id: "o1", orderNumber: "NPS12345678", totalCents: 5490, affiliate }) as never;

afterEach(() => vi.unstubAllEnvs());

describe("Keitaro postback URL", () => {
  it("builds a sale postback with subid, tid, revenue, payout and key", () => {
    vi.stubEnv("KEITARO_POSTBACK_URL", "https://trk.example.com/postback");
    vi.stubEnv("KEITARO_POSTBACK_KEY", "secret");
    const u = new URL(buildPostbackUrl(order({ ktSubid: "abc123", capturedAt: "x" }), "sale", 1500)!);
    expect(u.origin + u.pathname).toBe("https://trk.example.com/postback");
    expect(Object.fromEntries(u.searchParams)).toEqual({ subid: "abc123", status: "sale", tid: "NPS12345678", revenue: "54.90", payout: "15.00", key: "secret" });
  });
  it("sends rejected on refund", () => {
    vi.stubEnv("KEITARO_POSTBACK_URL", "https://trk.example.com/postback");
    expect(buildPostbackUrl(order({ ktSubid: "abc123", capturedAt: "x" }), "rejected", 1500)).toContain("status=rejected");
  });
  it("skips when there is no subid or no endpoint", () => {
    vi.stubEnv("KEITARO_POSTBACK_URL", "https://trk.example.com/postback");
    expect(buildPostbackUrl(order(null), "sale", 1500)).toBeNull();
    expect(buildPostbackUrl(order({ affId: "net1", capturedAt: "x" }), "sale", 1500)).toBeNull();
    vi.stubEnv("KEITARO_POSTBACK_URL", "");
    expect(buildPostbackUrl(order({ ktSubid: "abc", capturedAt: "x" }), "sale", 1500)).toBeNull();
  });
});
