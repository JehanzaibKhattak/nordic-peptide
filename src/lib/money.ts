// Prices and payments use EUR. These ECB reference rates are only used to
// display approximate local prices; they are not checkout currencies.
export const DISPLAY_CURRENCIES = ["EUR", "USD", "GBP", "SEK", "DKK", "CHF", "PLN", "CZK", "HUF", "RON"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

// ECB reference rates dated 5 Oct 2026, quoted as units per €1.
const RATES: Record<DisplayCurrency, number> = {
  EUR: 1,
  USD: 1.1204,
  GBP: 0.8472,
  SEK: 11.2525,
  DKK: 7.4745,
  CHF: 0.9311,
  PLN: 4.3795,
  CZK: 24.456,
  HUF: 367.8,
  RON: 5.3363,
};

const LOCALE_FOR_CURRENCY: Record<DisplayCurrency, string> = {
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  SEK: "sv-SE",
  DKK: "da-DK",
  CHF: "de-CH",
  PLN: "pl-PL",
  CZK: "cs-CZ",
  HUF: "hu-HU",
  RON: "ro-RO",
};

export const CURRENCY_NAMES: Record<DisplayCurrency, string> = {
  EUR: "Euro",
  USD: "US Dollar",
  GBP: "British Pound",
  SEK: "Swedish Krona",
  DKK: "Danish Krone",
  CHF: "Swiss Franc",
  PLN: "Polish Zloty",
  CZK: "Czech Koruna",
  HUF: "Hungarian Forint",
  RON: "Romanian Leu",
};

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  SEK: "kr",
  DKK: "kr",
  CHF: "CHF",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
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

/** Format an already-priced order; never apply storefront display exchange rates. */
export function formatOrderMoney(cents: number, currency: string = "EUR") {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100);
}
