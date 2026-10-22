import type { CartItem } from "./cart-store";

/** Replace this campaign product only; keep unrelated cart items for review at checkout. */
export function campaignCart(items: CartItem[], selection: CartItem): CartItem[] {
  if (!Number.isInteger(selection.qty) || selection.qty < 1 || selection.qty > 10) throw new Error("invalid_quantity");
  return [...items.filter(item => item.productId !== selection.productId), selection];
}
