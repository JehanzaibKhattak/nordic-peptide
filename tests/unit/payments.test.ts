import { describe, expect, it } from "vitest";
import { mockOutcome } from "@/lib/payments/mock";
import { convertCents, currencyForCountry, formatMoney, pricePerMl } from "@/lib/money";

describe("mock card outcomes", () => {
  it("resolves the documented test cards", () => {
    expect(mockOutcome("4242 4242 4242 4242")).toBe("success");
    expect(mockOutcome("4000000000000002")).toBe("declined");
    expect(mockOutcome("4000 0000 0000 0341")).toBe("delayed");
  });
  it("declines unknown 16-digit numbers and rejects malformed input", () => {
    expect(mockOutcome("1111222233334444")).toBe("declined");
    expect(mockOutcome("4242")).toBe("invalid");
  });
});

describe("money", () => {
  it("formats EUR and converts for display only", () => {
    expect(formatMoney(4900, "EUR")).toContain("49,00");
    expect(convertCents(10000, "GBP")).toBe(8600);
    expect(formatMoney(10000, "GBP")).toBe("£86.00");
  });
  it("picks display currency from the ship-to country", () => {
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("ES")).toBe("EUR");
  });
  it("computes price per ml", () => {
    expect(pricePerMl(4900, 30, "EUR")).toContain("1,63");
    expect(pricePerMl(1500, 0, "EUR")).toBe("");
  });
});
