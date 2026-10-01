// Shipping zones, methods and delivery estimation.
// Cutoff is 16:00 Europe/Berlin (CET/CEST). Business days Mon–Fri.

export type ShippingMethod = {
  id: "standard" | "express";
  price: number; // EUR cents
  etaDays: [number, number]; // business days min/max
  carriers: string[];
};

export type ShippingZone = {
  id: "EU" | "UK" | "CHNO" | "ROW";
  label: string;
  countries: string[]; // ISO-2; ROW is the fallback
  methods: ShippingMethod[];
  freeThresholdCents: number;
};

export const CUTOFF_HOUR = 16;
export const CUTOFF_TZ = "Europe/Berlin";

const EU = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
];

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "EU",
    label: "European Union",
    countries: EU,
    freeThresholdCents: 7500,
    methods: [
      { id: "standard", price: 590, etaDays: [2, 4], carriers: ["DHL", "PostNL"] },
      { id: "express", price: 1290, etaDays: [1, 2], carriers: ["DHL Express"] },
    ],
  },
  {
    id: "UK",
    label: "United Kingdom",
    countries: ["GB"],
    freeThresholdCents: 8500,
    methods: [
      { id: "standard", price: 690, etaDays: [3, 5], carriers: ["Royal Mail", "DPD"] },
      { id: "express", price: 1490, etaDays: [1, 3], carriers: ["DHL Express"] },
    ],
  },
  {
    id: "CHNO",
    label: "Switzerland & Norway",
    countries: ["CH", "NO"],
    freeThresholdCents: 9500,
    methods: [
      { id: "standard", price: 890, etaDays: [3, 6], carriers: ["DHL"] },
      { id: "express", price: 1690, etaDays: [2, 3], carriers: ["DHL Express"] },
    ],
  },
  {
    id: "ROW",
    label: "Rest of world",
    countries: [],
    freeThresholdCents: 15000,
    methods: [
      { id: "standard", price: 1490, etaDays: [6, 12], carriers: ["DHL"] },
      { id: "express", price: 2990, etaDays: [3, 6], carriers: ["DHL Express"] },
    ],
  },
];

export const SHIPPING_COUNTRIES: { code: string; name: string }[] = [
  ...EU.map((code) => ({ code, name: regionName(code) })),
  { code: "GB", name: "United Kingdom" },
  { code: "CH", name: "Switzerland" },
  { code: "NO", name: "Norway" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "United Arab Emirates" },
].sort((a, b) => a.name.localeCompare(b.name));

function regionName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function zoneForCountry(country: string): ShippingZone {
  return SHIPPING_ZONES.find((z) => z.countries.includes(country)) ?? SHIPPING_ZONES[3];
}

export function shippingCost(country: string, methodId: string, subtotalCents: number): number {
  const zone = zoneForCountry(country);
  const method = zone.methods.find((m) => m.id === methodId) ?? zone.methods[0];
  if (methodId === "standard" && subtotalCents >= zone.freeThresholdCents) return 0;
  return method.price;
}

export function flagEmoji(country: string) {
  return country
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// --- Delivery estimate -----------------------------------------------------

function hourInTz(date: Date, tz: string) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(date),
  );
}

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export type DeliveryEstimate = {
  from: Date;
  to: Date;
  cutoffPassed: boolean;
  msToCutoff: number;
  carriers: string[];
};

export function deliveryEstimate(country: string, methodId = "standard", now = new Date()): DeliveryEstimate {
  const zone = zoneForCountry(country);
  const method = zone.methods.find((m) => m.id === methodId) ?? zone.methods[0];
  const hour = hourInTz(now, CUTOFF_TZ);
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const cutoffPassed = hour >= CUTOFF_HOUR || isWeekend;
  const dispatch = cutoffPassed ? addBusinessDays(now, 1) : now;
  const cutoff = new Date(now);
  cutoff.setHours(cutoff.getHours() + (CUTOFF_HOUR - hour), 0, 0, 0);
  return {
    from: addBusinessDays(dispatch, method.etaDays[0]),
    to: addBusinessDays(dispatch, method.etaDays[1]),
    cutoffPassed,
    msToCutoff: cutoffPassed ? 0 : Math.max(0, cutoff.getTime() - now.getTime()),
    carriers: method.carriers,
  };
}

export function formatDateRange(from: Date, to: Date, locale = "en") {
  const f = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
  return `${f.format(from)} – ${f.format(to)}`;
}
