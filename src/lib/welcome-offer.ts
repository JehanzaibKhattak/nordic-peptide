import { createHash, createHmac } from "node:crypto";
import { db } from "./db";

export const WELCOME_DISCOUNT_PERCENT = 10;

/**
 * Deterministic per-email code so resubmitting the same address returns the
 * same single-use coupon instead of minting a new one.
 */
export function welcomeCode(email: string) {
  const secret = process.env.SESSION_SECRET ?? "peptbay-welcome-offer";
  const digest = createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
  return `WELCOME10-${digest.slice(0, 10).toUpperCase()}`;
}

export async function issueWelcomeOffer(email: string) {
  const code = welcomeCode(email);
  await db.coupon.upsert({
    where: { code },
    create: {
      code,
      type: "PERCENT",
      value: WELCOME_DISCOUNT_PERCENT,
      minCents: 0,
      active: true,
      usageLimit: 1,
    },
    update: {},
  });
  return code;
}

/** Stable fingerprint used only for rate-limit keys, never exposed. */
export function emailFingerprint(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}
