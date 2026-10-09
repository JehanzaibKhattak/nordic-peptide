"use client";

import { useCart } from "@/lib/cart-store";
import { currencyForCountry, formatMoney, type DisplayCurrency } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";

// Display currency follows the ship-to country; EUR until hydrated so SSR and
// first client render match.
export function useCurrency() {
  const country = useCart((s) => s.country);
  const selectedCurrency = useCart((s) => s.currency);
  const setCurrency = useCart((s) => s.setCurrency);
  const mounted = useHydrated();
  const currency: DisplayCurrency = mounted ? selectedCurrency ?? currencyForCountry(country) : "EUR";
  return { currency, setCurrency, country: mounted ? country : "ES", fmt: (cents: number) => formatMoney(cents, currency), mounted };
}
