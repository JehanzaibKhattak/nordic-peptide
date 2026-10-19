"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";

export function AvionContinueShopping({ label }: { label: string }) {
  const clear = useCart(state => state.clear);
  return <Button render={<Link href="/shop" />} onClick={() => {
    clear();
    sessionStorage.removeItem("avion-checkout-request");
  }}>{label}</Button>;
}
