import { describe, expect, it } from "vitest";
import { bankTransferConfig } from "@/lib/bank-transfer";

describe("bank transfer activation", () => {
  const configured = { BANK_TRANSFER_ENABLED: "true", BANK_TRANSFER_INSTRUCTIONS: "Approved bank details", BANK_TRANSFER_CURRENCY: "GBP", BANK_TRANSFER_DEADLINE_HOURS: "48" };
  it("requires explicit activation, approved instructions, currency and a bounded deadline", () => {
    expect(bankTransferConfig({})).toBeNull();
    for (const field of Object.keys(configured)) expect(bankTransferConfig({ ...configured, [field]: "" })).toBeNull();
    expect(bankTransferConfig({ ...configured, BANK_TRANSFER_DEADLINE_HOURS: "169" })).toBeNull();
    expect(bankTransferConfig({ ...configured, BANK_TRANSFER_CURRENCY: "invalid" })).toBeNull();
    expect(bankTransferConfig(configured)).toEqual({ instructions: "Approved bank details", currency: "GBP", hours: 48 });
  });
});

import { guestOwnerMatches } from "@/lib/guest-checkout";
it("requires the private guest session to read a guest receipt", () => {
  expect(guestOwnerMatches({ id: "owner" }, "owner")).toBe(true);
  expect(guestOwnerMatches({ id: "owner" }, "other")).toBe(false);
  expect(guestOwnerMatches({ id: "owner" }, undefined)).toBe(false);
  expect(guestOwnerMatches(undefined, "owner")).toBe(false);
});
