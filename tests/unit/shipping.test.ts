import { describe, expect, it } from "vitest";
import { deliveryEstimate, shippingCost, zoneForCountry } from "@/config/shipping";

describe("shipping", () => {
  it("maps countries to zones with ROW fallback", () => {
    expect(zoneForCountry("ES").id).toBe("EU");
    expect(zoneForCountry("GB").id).toBe("UK");
    expect(zoneForCountry("NO").id).toBe("CHNO");
    expect(zoneForCountry("US").id).toBe("ROW");
  });

  it("charges standard below the free threshold and nothing at or above it", () => {
    expect(shippingCost("ES", "standard", 4900)).toBe(590);
    expect(shippingCost("ES", "standard", 7500)).toBe(0);
    expect(shippingCost("GB", "standard", 8499)).toBe(690);
  });

  it("never makes express free", () => {
    expect(shippingCost("ES", "express", 50000)).toBe(1290);
  });

  it("ships same day before cutoff on a weekday, next business day after", () => {
    // Wed 7 Oct 2026 10:00 Berlin (08:00 UTC, CEST)
    const before = deliveryEstimate("ES", "standard", new Date("2026-10-07T08:00:00Z"));
    expect(before.cutoffPassed).toBe(false);
    expect(before.msToCutoff).toBeGreaterThan(0);
    // Wed 7 Oct 2026 17:00 Berlin
    const after = deliveryEstimate("ES", "standard", new Date("2026-10-07T15:00:00Z"));
    expect(after.cutoffPassed).toBe(true);
    expect(after.from.getTime()).toBeGreaterThan(before.from.getTime());
  });

  it("skips weekends in the delivery window", () => {
    // Fri 9 Oct 2026 10:00 Berlin, EU standard 2–4 business days → Tue 13 – Thu 15
    const est = deliveryEstimate("ES", "standard", new Date("2026-10-09T08:00:00Z"));
    expect(est.from.getDay()).toBe(2);
    expect(est.to.getDay()).toBe(4);
  });
});

describe("UK launch settings", () => {
  it("limits destinations and services, retaining standard charges", async () => {
    const { vi } = await import("vitest");
    vi.stubEnv("NEXT_PUBLIC_UK_ONLY_SHIPPING", "true");
    vi.resetModules();
    const shipping = await import("@/config/shipping");
    expect(shipping.SHIPPING_COUNTRIES.map(c => c.code)).toEqual(["GB"]);
    expect(shipping.shippingAllowed("ES", "standard")).toBe(false);
    expect(shipping.shippingAllowed("GB", "express")).toBe(false);
    expect(shipping.shippingAllowed("GB", "standard")).toBe(true);
    expect(shipping.shippingAllowed("GB", "standard", "BT1 1AA")).toBe(false);
    expect(shipping.shippingAllowed("GB", "standard", "SW1A 1AA")).toBe(true);
    expect(shipping.zoneForCountry("GB").methods[0].carriers).toEqual(["Royal Mail Tracked 24"]);
    expect(shipping.shippingCost("GB", "standard", 8499)).toBe(690);
    expect(shipping.shippingCost("GB", "standard", 8500)).toBe(0);
    expect(shipping.CUTOFF_TZ).toBe("Europe/London");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
