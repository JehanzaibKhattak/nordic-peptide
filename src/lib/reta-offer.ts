/** Approved 20 mg RETA pack prices in GBP pence; other SKUs and quantities keep catalogue prices. */
export const RETA_PACKS = [
  { qty: 1, totalCents: 16720, percent: 20 },
  { qty: 2, totalCents: 31350, percent: 25 },
  { qty: 3, totalCents: 43890, percent: 30 },
] as const;

export function retaPackOffer(sku: string, qty: number, currency: string) {
  return sku === "RET20" && currency === "GBP" ? RETA_PACKS.find(pack => pack.qty === qty) ?? null : null;
}

export function retaPackDiscount(sku: string, qty: number, currency: string, catalogueUnitCents: number) {
  const offer = retaPackOffer(sku, qty, currency);
  return offer ? Math.max(0, catalogueUnitCents * qty - offer.totalCents) : 0;
}
