// Prices are stored and charged in EUR cents. Other currencies are
// display-only conversions using a static rate table.

export const DISPLAY_CURRENCIES = ["EUR", "GBP", "USD"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const RATES: Record<DisplayCurrency, number> = { EUR: 1, GBP: 0.86, USD: 1.09 };

const LOCALE_FOR_CURRENCY: Record<DisplayCurrency, string> = {
  EUR: "de-DE",
  GBP: "en-GB",
  USD: "en-US",
};

export function convertCents(eurCents: number, to: DisplayCurrency): number {
  return Math.round(eurCents * RATES[to]);
}

export function formatMoney(
  eurCents: number,
  currency: DisplayCurrency = "EUR",
  opts: { convert?: boolean } = { convert: true },
): string {
  const cents = opts.convert === false ? eurCents : convertCents(eurCents, currency);
  return new Intl.NumberFormat(LOCALE_FOR_CURRENCY[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function pricePerMl(priceCents: number, sizeMl: number, currency: DisplayCurrency = "EUR") {
  if (!sizeMl) return "";
  return `${formatMoney(Math.round(priceCents / sizeMl), currency)}/ml`;
}

export function currencyForCountry(country: string): DisplayCurrency {
  if (country === "GB") return "GBP";
  if (country === "US" || country === "CA") return "USD";
  return "EUR";
}
