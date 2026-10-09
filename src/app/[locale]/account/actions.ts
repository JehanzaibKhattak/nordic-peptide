"use server";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { commerceRateLimit } from "@/lib/commerce-rate-limit";
import { createElement } from "react";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { currentPurchaser, getPurchaserSession } from "@/lib/purchaser-session";
import { LOCALES } from "@/lib/types";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const localeOf = (fd: FormData) => z.enum(LOCALES).parse(fd.get("locale"));
const digest = (email: string, code: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(`${email}:${code}`).digest("hex");

export async function requestCode(fd: FormData) {
  await getPurchaserSession(); // Validate session configuration before issuing a challenge.
  const locale = localeOf(fd);
  const email = emailSchema.parse(fd.get("email"));
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await commerceRateLimit(`login:${ip}`, 10, 3600000))) redirect(`/${locale}/account?message=rate_limited`);
  const code = String(randomInt(100000, 1000000));
  const now = new Date();
  const sent = await db.$transaction(async tx => {
    const existing = await tx.loginChallenge.findUnique({ where: { email } });
    if (existing && now.getTime() - existing.sentAt.getTime() < 60_000) return false;
    await tx.loginChallenge.upsert({ where: { email },
      create: { email, digest: digest(email, code), expiresAt: new Date(now.getTime() + 10 * 60_000) },
      update: { digest: digest(email, code), attempts: 0, sentAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000) },
    });
    return true;
  });
  if (sent) await sendEmail({ to: email, subject: "Avion-PEPT sign-in code", react: createElement("p", null, `Your sign-in code is ${code}. It expires in 10 minutes. Do not share it.`) });
  redirect(`/${locale}/account?message=code_sent`);
}

export async function verifyCode(fd: FormData) {
  const locale = localeOf(fd);
  const email = emailSchema.parse(fd.get("email"));
  const code = z.string().regex(/^\d{6}$/).parse(fd.get("code"));
  const session = await getPurchaserSession();
  const purchaser = await db.$transaction(async tx => {
    const claimed = await tx.loginChallenge.updateMany({ where: { email, attempts: { lt: 5 }, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
    if (!claimed.count) return null;
    const challenge = (await tx.loginChallenge.findUnique({ where: { email } }))!;
    if (!timingSafeEqual(Buffer.from(challenge.digest), Buffer.from(digest(email, code)))) return null;
    await tx.loginChallenge.delete({ where: { email } });
    return tx.purchaser.upsert({ where: { email }, create: { email, emailVerifiedAt: new Date() }, update: { emailVerifiedAt: new Date() } });
  });
  if (!purchaser) redirect(`/${locale}/account?message=invalid_code`);
  session.purchaserId = purchaser.id;
  await session.save();
  redirect(`/${locale}/account`);
}

export async function submitResearchApplication(fd: FormData) {
  const locale = localeOf(fd);
  const purchaser = await currentPurchaser();
  if (!purchaser) redirect(`/${locale}/account`);
  const data = z.object({
    organization: z.string().trim().min(2).max(200),
    registrationId: z.string().trim().min(3).max(200),
    website: z.url().max(500).refine(v => /^https?:\/\//.test(v)),
    researchPurpose: z.string().trim().min(40).max(4000),
    researchOnly: z.literal("on"),
  }).parse(Object.fromEntries(fd));
  await db.$transaction(async tx => {
    if (await tx.order.count({ where: { purchaserId: purchaser.id, paymentProvider: "stripe", status: { in: ["PENDING", "RESERVED"] } } })) throw new Error("An open payment session must expire before changing this application.");
    await tx.purchaser.update({ where: { id: purchaser.id }, data: {
      organization: data.organization, registrationId: data.registrationId, website: data.website,
      researchPurpose: data.researchPurpose, status: "PENDING", approvedUntil: null, reviewedAt: null,
    } });
    await tx.commerceApproval.create({ data: { subject: `purchaser:${purchaser.id}`, decision: "SUBMITTED", evidence: JSON.stringify(data), reviewer: purchaser.email } });
  }, { isolationLevel: "Serializable" });
  redirect(`/${locale}/account?message=submitted`);
}

export async function signOut(fd: FormData) {
  (await getPurchaserSession()).destroy();
  redirect(`/${localeOf(fd)}/account`);
}
