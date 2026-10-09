import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/types";

export type DemoCheckoutDraft = {
  token: string;
  locale: string;
  email: string;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: "standard" | "express";
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  items: CartItem[];
};

export type DemoOrder = DemoCheckoutDraft & {
  orderNumber: string;
  paidAt: string;
};

const checkoutKey = (token: string) => `avion-pept-demo-checkout:${token}`;
const orderKey = (orderNumber: string) => `avion-pept-demo-order:${orderNumber}`;

export function saveDemoCheckout(draft: DemoCheckoutDraft) {
  sessionStorage.setItem(checkoutKey(draft.token), JSON.stringify(draft));
}

export function loadDemoCheckout(token: string): DemoCheckoutDraft | null {
  try {
    const value = sessionStorage.getItem(checkoutKey(token));
    return value ? JSON.parse(value) as DemoCheckoutDraft : null;
  } catch {
    return null;
  }
}

export function saveDemoOrder(order: DemoOrder) {
  sessionStorage.setItem(orderKey(order.orderNumber), JSON.stringify(order));
  sessionStorage.removeItem(checkoutKey(order.token));
}

export function loadDemoOrder(orderNumber: string): DemoOrder | null {
  try {
    const value = sessionStorage.getItem(orderKey(orderNumber));
    return value ? JSON.parse(value) as DemoOrder : null;
  } catch {
    return null;
  }
}
