import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { DISPLAY_CURRENCIES } from "./money";
import { SHIPPING_COUNTRIES } from "@/config/shipping";

export function stripeTestEnabled() {
  return process.env.STRIPE_CHECKOUT_ENABLED === "true" &&
    process.env.LIVE_PAYMENTS_ENABLED !== "true" &&
    Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"));
}

export function purchaserApproved(p: { emailVerifiedAt: Date | null; status: string; approvedUntil: Date | null } | null) {
  return Boolean(p?.emailVerifiedAt && p.status === "APPROVED" && p.approvedUntil && p.approvedUntil > new Date());
}

export function productApproved(p: { isActive: boolean; researchApproved: boolean; approvedCountries: unknown }, country: string) {
  return p.isActive && p.researchApproved && Array.isArray(p.approvedCountries) && p.approvedCountries.includes(country);
}

export async function assertEligibility(purchaserId: string, country: string, variantIds: string[], client: Prisma.TransactionClient = db) {
  const [purchaser, destination, variants] = await Promise.all([
    client.purchaser.findUnique({ where: { id: purchaserId } }),
    client.shippingApproval.findUnique({ where: { country } }),
    client.variant.findMany({ where: { id: { in: variantIds } }, include: { product: true } }),
  ]);
  if (!purchaserApproved(purchaser)) throw new Error("purchaser_approval_required");
  if (!SHIPPING_COUNTRIES.some(c => c.code === country) || !destination?.approved) throw new Error("destination_not_approved");
  if (variants.length !== variantIds.length || variants.some(v => !v.isActive || !productApproved(v.product, country))) throw new Error("product_not_approved");
  return { purchaser: purchaser!, variants };
}

export async function checkoutRate(currency: string) {
  if (!DISPLAY_CURRENCIES.includes(currency as typeof DISPLAY_CURRENCIES[number])) throw new Error("currency_not_supported");
  if (currency === "EUR") return 1;
  const config = await db.checkoutCurrency.findUnique({ where: { code: currency } });
  if (!config?.enabled || !Number.isFinite(config.eurRate) || config.eurRate <= 0 || config.eurRate > 10000) throw new Error("currency_not_configured");
  return config.eurRate;
}

export function trustedAmount(cents: number, rate: number) {
  const amount = Math.round(cents * rate);
  if (!Number.isSafeInteger(cents) || cents < 0 || !Number.isSafeInteger(amount) || amount < 0 || amount > 99_999_999) throw new Error("invalid_price");
  return amount;
}
