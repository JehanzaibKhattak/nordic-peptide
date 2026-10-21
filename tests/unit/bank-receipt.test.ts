import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { bankInstructionDetails } from "@/lib/bank-transfer";

vi.stubGlobal("React", React);
vi.mock("@/i18n/routing", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children) }));
vi.mock("@/components/checkout/avion-continue-shopping", () => ({ AvionContinueShopping: () => null }));
import { BankTransferReceipt } from "@/components/checkout/bank-transfer-receipt";

const instructions = "Payment currency: GBP; Account holder: Example Ltd; Bank: Example Bank; UK account number: 12345678; Sort code: 12-34-56; For international transfers: IBAN GB00 TEST 1234; SWIFT/BIC: TESTGBXX; Bank address: 1 Example Road, London. Use your order number as payment reference. Your order is awaiting payment until receipt is confirmed.";
const order = { orderNumber: "NPS12345678", status: "PENDING", currency: "GBP", totalCents: 20900, shippingCents: 0, discountCents: 0, items: [{ id: "item", name: "Example product", variantLabel: "20 mg", qty: 1, lineCents: 20900 }] };
const props = { order, bank: { instructions, reference: order.orderNumber, deadline: "2026-10-23T13:13:53Z" }, overdue: false, backendNumber: "AV-10001", syncPending: false, refreshUrl: "/en/checkout/received?session=example" };

describe("bank transfer receipt", () => {
  it("extracts saved bank values without changing them and preserves unknown formats as text", () => {
    expect(bankInstructionDetails(instructions)).toEqual({ holder: "Example Ltd", bank: "Example Bank", account: "12345678", sortCode: "12-34-56", iban: "GB00 TEST 1234", bic: "TESTGBXX", address: "1 Example Road, London" });
    expect(bankInstructionDetails("Custom payment instructions")).toBeNull();
  });
  it("uses the saved amount and transfer reference, labels the separate order ID and offers copy controls", () => {
    const html = renderToStaticMarkup(createElement(BankTransferReceipt, props));
    expect(html).toContain("£209.00");
    expect(html).toContain("Copy payment reference");
    expect(html).toContain("NPS12345678");
    expect(html).toContain("Order ID: AV-10001");
    expect(html).toContain("Copy account number");
    expect(html).toContain("<details");
    expect(html).toContain("Example product");
    expect(html).toContain("London time");
    expect(html).not.toContain("back office");
  });
  it("does not invite another payment or expose bank details for overdue or paid orders", () => {
    for (const overrides of [{ overdue: true }, { order: { ...order, status: "PAID" } }]) {
      const html = renderToStaticMarkup(createElement(BankTransferReceipt, { ...props, ...overrides }));
      expect(html).not.toContain("Copy account number");
      expect(html).not.toContain("Copy payment reference");
      expect(html).not.toContain("12345678</span>");
      expect(html).not.toContain("Amount to transfer");
    }
  });
});
