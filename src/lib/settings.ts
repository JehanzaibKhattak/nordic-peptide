import type { Prisma } from "@prisma/client";
import { db } from "./db";

// Admin-editable settings stored in the Setting table; env provides defaults.
export type Settings = {
  brandName: string;
  legalEntityName: string;
  cutoffHour: number;
  reservationMinutes: number;
  affiliatePayoutCents: number;
  mockPaymentsEnabled: boolean;
  stripeEnabled: boolean;
  reviewsRating: number;
  reviewsCount: number;
  reviewsSource: string;
};

const defaults = (): Settings => ({
  brandName: process.env.BRAND_NAME ?? "Nordic Peptide Skin",
  legalEntityName: process.env.LEGAL_ENTITY_NAME ?? "Nordic Peptide Skin Ltd",
  cutoffHour: 16,
  reservationMinutes: Number(process.env.RESERVATION_MINUTES ?? 30),
  affiliatePayoutCents: Number(process.env.AFFILIATE_PAYOUT_CENTS ?? 1500),
  mockPaymentsEnabled: process.env.PAY_MOCK_ENABLED === "1",
  stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
  reviewsRating: Number(process.env.REVIEWS_RATING ?? 4.6),
  reviewsCount: Number(process.env.REVIEWS_COUNT ?? 1284),
  reviewsSource: process.env.REVIEWS_SOURCE ?? "Reviews",
});

export async function getSettings(): Promise<Settings> {
  const base = defaults();
  const rows = await db.setting.findMany();
  const over: Partial<Settings> = {};
  for (const r of rows) (over as Record<string, unknown>)[r.key] = r.value;
  return { ...base, ...over };
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const v = value as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}
