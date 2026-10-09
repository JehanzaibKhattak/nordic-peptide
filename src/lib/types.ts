export const LOCALES = ["en", "es", "de", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const ORDER_STATUSES = [
  "PAYMENT_FAILED",
  "PENDING",
  "RESERVED",
  "PAID",
  "FULFILLED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCT_FORMS = ["SERUM", "CREAM", "EYE", "MASK", "BUNDLE", "ACCESSORY"] as const;
export type ProductForm = (typeof PRODUCT_FORMS)[number];

export type Localized = Partial<Record<Locale, string>> & { en: string };

export type ProductSpecs = {
  keyPeptides: string[];
  inci: string;
  skinTypes: string[];
  texture: string;
  ph: string;
  pao: string; // period after opening, e.g. "12M"
  shelfLife: string;
  usage: string;
};

export type Faq = { q: string; a: string };
export type LocalizedFaqs = Partial<Record<Locale, Faq[]>>;

export type Address = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string; // ISO-2
  phone?: string;
};

export type Affiliate = {
  ktSubid?: string;
  affId?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  source?: string;
  capturedAt: string;
};

/** Pick the string for a locale, falling back to English. */
export function t(value: unknown, locale: string): string {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : "";
  const v = value as Record<string, string>;
  return v[locale] ?? v.en ?? "";
}

export function isOrderStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(s);
}
