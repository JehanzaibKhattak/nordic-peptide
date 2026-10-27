import { describe, it, expect } from "vitest";
import { validCheckoutPhone } from "@/lib/checkout-phone";
describe("checkout phone", () => {
  it("accepts formatted UK and international contact numbers", () => {
    for (const value of ["07700 900123", "+44 (7700) 900-123", "+34 612 345 678"]) expect(validCheckoutPhone(value)).toBe(true);
  });
  it("rejects missing, blank, short and malformed numbers", () => {
    for (const value of [undefined, null, "", "   ", "123", "call me", "+44+7700900123", "00000000000", "1234567890123456"]) expect(validCheckoutPhone(value)).toBe(false);
  });
});
