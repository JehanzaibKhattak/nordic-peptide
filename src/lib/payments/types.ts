import type { CheckoutSession, Order, OrderItem } from "@prisma/client";

export type OrderForPayment = Order & { items: OrderItem[] };

export type CreatePaymentResult =
  | { kind: "redirect"; url: string }
  | { kind: "inline-form"; componentKey: "mock" | "stripe-elements"; clientSecret?: string };

export type WebhookResult = {
  orderId: string;
  status: "paid" | "failed" | "expired" | "refunded";
  providerRef: string;
  raw: unknown;
};

export interface PaymentAdapter {
  id: string; // "mock" | "stripe" | "ziina"
  method: "card";
  label: string;
  isEnabled(): boolean;
  createPayment(
    order: OrderForPayment,
    session: CheckoutSession,
    ctx: { returnUrl: string; webhookUrl: string },
  ): Promise<CreatePaymentResult>;
  handleWebhook(req: Request): Promise<WebhookResult>;
  /** Optional server-to-server confirmation when the customer returns from a hosted page. */
  verifyReturn?(order: Order): Promise<WebhookResult | null>;
  refund?(order: Order, amountCents: number): Promise<void>;
}
