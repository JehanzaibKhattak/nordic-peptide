"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { SHIPPING_COUNTRIES } from "@/config/shipping";
import { DISPLAY_CURRENCIES } from "@/lib/money";

export async function reviewCommerce(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("Unauthorized");
  const input = z.object({ kind: z.enum(["purchaser", "product", "destination", "currency"]), id: z.string().min(1).max(200), decision: z.enum(["APPROVED", "REJECTED"]), evidence: z.string().trim().min(30).max(4000), reviewer: z.string().trim().min(3).max(200) }).parse(Object.fromEntries(fd));
  const approved = input.decision === "APPROVED";
  await db.$transaction(async tx => {
    // Existing hosted links must be expired before their approval can change.
    const active = await tx.order.count({ where: {
      paymentProvider: "stripe", status: { in: ["PENDING", "RESERVED"] },
      ...(input.kind === "purchaser" ? { purchaserId: input.id } : input.kind === "product" ? { items: { some: { productId: input.id } } } : input.kind === "destination" ? { shippingCountry: input.id } : { currency: input.id }),
    } });
    if (active) throw new Error("Expire or reconcile affected Stripe sessions in Orders before changing this approval.");
    if (input.kind === "purchaser") {
      const p = await tx.purchaser.findUniqueOrThrow({ where: { id: input.id } });
      if (approved && (!p.emailVerifiedAt || !p.organization || !p.registrationId || !p.website || p.researchPurpose.length < 40)) throw new Error("Incomplete verification");
      const days = z.coerce.number().int().min(1).max(365).parse(fd.get("days") || 90);
      await tx.purchaser.update({ where: { id: input.id }, data: { status: input.decision, reviewedAt: new Date(), reviewNotes: input.evidence, approvedUntil: approved ? new Date(Date.now() + days * 86400000) : null } });
    } else if (input.kind === "product") {
      const countries = String(fd.get("countries") ?? "").split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
      if (approved && (!countries.length || countries.some(c => !SHIPPING_COUNTRIES.some(s => s.code === c)))) throw new Error("Select supported destinations");
      await tx.product.update({ where: { id: input.id }, data: { researchApproved: approved, approvedCountries: countries } });
      input.evidence += `\nCountries: ${countries.join(", ")}`;
    } else if (input.kind === "destination") {
      if (!SHIPPING_COUNTRIES.some(c => c.code === input.id)) throw new Error("Invalid country");
      await tx.shippingApproval.upsert({ where: { country: input.id }, create: { country: input.id, approved }, update: { approved } });
    } else {
      if (!DISPLAY_CURRENCIES.some(c => c === input.id) || input.id === "EUR") throw new Error("Invalid currency");
      const eurRate = z.coerce.number().positive().max(10000).parse(fd.get("rate"));
      await tx.checkoutCurrency.upsert({ where: { code: input.id }, create: { code: input.id, eurRate, enabled: approved }, update: { eurRate, enabled: approved } });
      input.evidence += `\nEUR rate: ${eurRate}`;
    }
    await tx.commerceApproval.create({ data: { subject: `${input.kind}:${input.id}`, decision: input.decision, evidence: input.evidence, reviewer: input.reviewer } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin/approvals");
}
