import { stripeAdapter } from "./stripe";
import type { PaymentAdapter } from "./types";

const ALL: PaymentAdapter[] = [stripeAdapter];

export function enabledAdapters(): PaymentAdapter[] {
  return ALL.filter((a) => a.isEnabled());
}

export function getAdapter(id: string): PaymentAdapter | undefined {
  return ALL.find((a) => a.id === id && a.isEnabled());
}
