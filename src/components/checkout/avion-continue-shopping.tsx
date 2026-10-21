"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";

export function AvionContinueShopping({ label, secondary = false }: { label: string; secondary?: boolean }) {
  const clear = useCart(state => state.clear);
  return <Button variant={secondary ? "outline" : "default"} render={<Link href="/shop" />} onClick={() => {
    clear();
    sessionStorage.removeItem("avion-checkout-request");
  }}>{label}</Button>;
}
