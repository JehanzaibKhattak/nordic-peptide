import type { PaymentAdapter } from "./types";

// Dev-only adapter. The inline form posts to /api/checkout/mock-confirm which
// resolves the outcome from the card number and marks the order directly.
//   4242 4242 4242 4242 → success
//   4000 0000 0000 0002 → declined
//   4000 0000 0000 0341 → success after 5s (simulated 3DS)

export const MOCK_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
  delayed: "4000000000000341",
} as const;

export function mockOutcome(cardNumber: string): "success" | "declined" | "delayed" | "invalid" {
  const n = cardNumber.replace(/\s+/g, "");
  if (n === MOCK_CARDS.success) return "success";
  if (n === MOCK_CARDS.declined) return "declined";
  if (n === MOCK_CARDS.delayed) return "delayed";
  return /^\d{16}$/.test(n) ? "declined" : "invalid";
}

export const mockAdapter: PaymentAdapter = {
  id: "mock",
  method: "card",
  label: "Card (test mode)",
  isEnabled: () => process.env.PAY_MOCK_ENABLED === "1" && process.env.NODE_ENV !== "production",
  async createPayment() {
    return { kind: "inline-form", componentKey: "mock" };
  },
  async handleWebhook() {
    throw new Error("mock adapter has no external webhook");
  },
  async refund() {
    /* no-op in mock */
  },
};
