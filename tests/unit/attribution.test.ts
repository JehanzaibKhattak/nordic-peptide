import { describe, it, expect } from "vitest";
import { normalizeAttribution, ATTRIBUTION_WINDOW_MS } from "@/lib/affiliate/attribution";

describe("Keitaro attribution", () => {
  const now = Date.now();
  it("normalizes documented and legacy keys, retaining affiliate and UTM details", () => {
    expect(normalizeAttribution({ subid: "click_123", aff: "network", sub1: "netclick", utm_source: "affiliate", utm_campaign: "launch", ts: String(now) }, now))
      .toMatchObject({ ktSubid: "click_123", affId: "network", sub1: "netclick", source: "affiliate", utm_campaign: "launch" });
  });
  it("rejects absent IDs, expired/future timestamps and oversized fields", () => {
    for (const a of [{ aff: "alone", ts: now }, { kt: "bad click", ts: now }, { kt: "old", ts: now - ATTRIBUTION_WINDOW_MS }, { kt: "future", ts: now + 600000 }]) expect(normalizeAttribution(a, now)).toBeNull();
    expect(normalizeAttribution({ kt: "ok", sub1: "a".repeat(201), ts: now }, now)).not.toHaveProperty("sub1");
  });
});
