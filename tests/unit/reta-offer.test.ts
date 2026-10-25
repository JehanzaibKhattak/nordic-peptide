import { describe, expect, it } from "vitest";
import { retaPackDiscount, retaPackOffer } from "@/lib/reta-offer";

describe("approved RETA 20 mg offer", () => {
  it.each([[1, 16720, 20], [2, 31350, 25], [3, 43890, 30]])("prices %i pens consistently", (qty, total, percent) => {
    expect(retaPackOffer("RET20", qty, "GBP")).toMatchObject({ totalCents: total, percent });
    expect(20900 * qty - retaPackDiscount("RET20", qty, "GBP", 20900)).toBe(total);
  });
  it("does not discount other strengths, currencies or quantities", () => {
    for (const [sku, qty, currency] of [["RET40", 2, "GBP"], ["RET20", 2, "EUR"], ["RET20", 4, "GBP"], ["RET20", 1.5, "GBP"]] as const) {
      expect(retaPackDiscount(sku, qty, currency, 20900)).toBe(0);
    }
    expect(retaPackDiscount("RET20", 1, "GBP", 10000)).toBe(0);
  });
});
