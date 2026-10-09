import { createHash } from "node:crypto";
import { db } from "./db";

/** Shared fixed-window limits survive Vercel cold starts and multiple instances. */
export async function commerceRateLimit(subject: string, limit: number, windowMs: number) {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const key = createHash("sha256").update(`${subject}:${window}`).digest("hex");
  await db.commerceRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  const counter = await db.commerceRateLimit.upsert({ where: { key },
    create: { key, expiresAt: new Date((window + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  return counter.count <= limit;
}
