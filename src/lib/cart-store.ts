"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image: string;
  unitCents: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  couponCode: string | null;
  country: string;
  isOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  setCoupon: (code: string | null) => void;
  setCountry: (country: string) => void;
  open: () => void;
  close: () => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      country: "ES",
      isOpen: false,
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const items = existing
            ? s.items.map((i) => (i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i))
            : [...s.items, { ...item, qty }];
          return { items, isOpen: true };
        }),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQty: (variantId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.variantId !== variantId)
              : s.items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
        })),
      setCoupon: (couponCode) => set({ couponCode }),
      setCountry: (country) => set({ country }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    {
      name: "nps-cart",
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, country: s.country }),
    },
  ),
);

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
}
export function cartCount(items: CartItem[]) {
  return items.reduce((n, i) => n + i.qty, 0);
}
