"use server";

import { timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession, requireAdmin } from "@/lib/admin-session";
import { cancelOrder, logEvent, markFulfilled, markPaid, markRefunded } from "@/lib/orders";
import { firePostback } from "@/lib/affiliate/postback";
import { stripeAdapter, stripeClient } from "@/lib/payments/stripe";
import { reconcileStripeSession } from "@/lib/payments/stripe-webhook";
import { getAdapter } from "@/lib/payments/registry";
import { getSettings, setSetting } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { OrderShippedEmail, PaymentReceivedEmail } from "@/lib/email/templates";
import { LOCALES } from "@/lib/types";

async function guard() {
  if (!(await requireAdmin())) redirect("/admin/login");
}

function revalidateStore() {
  for (const l of LOCALES) revalidatePath(`/${l}`, "layout");
}

export async function loginAction(_: unknown, fd: FormData) {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return { error: "Admin access is not configured." };
  const given = Buffer.from(String(fd.get("password") ?? ""));
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
  const ok = expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  if (!ok) return { error: "Wrong password" };
  const s = await getAdminSession();
  s.isAdmin = true;
  await s.save();
  redirect("/admin");
}

export async function logoutAction() {
  const s = await getAdminSession();
  s.destroy();
  redirect("/admin/login");
}

// --- Orders ---------------------------------------------------------------

export async function markPaidAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  await markPaid(id, "manual", `admin_${Date.now()}`);
  revalidatePath(`/admin/orders/${id}`);
}

export async function fulfilAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  await markFulfilled(id, String(fd.get("trackingNo") ?? "").trim() || undefined);
  revalidatePath(`/admin/orders/${id}`);
}

export async function refundAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return;
  const adapter = order.paymentProvider === "stripe" ? stripeAdapter : order.paymentProvider ? getAdapter(order.paymentProvider) : undefined;
  if (adapter?.refund) {
    try {
      await adapter.refund(order, order.totalCents);
      await logEvent(id, "refund.requested", { provider: adapter.id, amountCents: order.totalCents });
    } catch (e) {
      await logEvent(id, "refund.failed", { provider: adapter.id, error: String(e) });
      revalidatePath(`/admin/orders/${id}`);
      return;
    }
  }
  if (order.paymentProvider !== "stripe") await markRefunded(id, "admin");
  revalidateStore();
  revalidatePath(`/admin/orders/${id}`);
}

export async function cancelAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  if (order.paymentProvider === "stripe") {
    if (!order.stripeSessionId) throw new Error("Stripe creation is unresolved. Reconcile in Stripe before releasing inventory.");
    const current = await stripeClient().checkout.sessions.retrieve(order.stripeSessionId);
    const session = current.status === "open" ? await stripeClient().checkout.sessions.expire(current.id) : current;
    await reconcileStripeSession(session);
  } else await cancelOrder(id);
  revalidateStore();
  revalidatePath(`/admin/orders/${id}`);
}

export async function resendPostbackAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return;
  const settings = await getSettings();
  await firePostback(order, order.status === "REFUNDED" ? "rejected" : "sale", settings.affiliatePayoutCents);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/postbacks");
}

export async function resendEmailAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return;
  const base = process.env.STORE_BASE_URL ?? "http://localhost:3000";
  const shipped = order.status === "FULFILLED";
  await sendEmail({
    to: order.email,
    subject: shipped ? `Order ${order.orderNumber} has shipped` : `Order ${order.orderNumber} confirmed`,
    react: shipped ? OrderShippedEmail({ order }) : PaymentReceivedEmail({ order, orderUrl: `${base}/${order.locale}/order/${order.orderNumber}` }),
  });
  await logEvent(id, "email.resent", { template: shipped ? "order_shipped" : "payment_received" });
  revalidatePath(`/admin/orders/${id}`);
}

// --- Products -------------------------------------------------------------

type EditableVariant = { id?: string; sku: string; label: string; concentration: string; sizeMl: number; priceCents: number; stock: number; isActive: boolean };
type ProductFields = {
  id?: string;
  slug: string;
  sku: string;
  categoryId: string;
  form: string;
  name: { en: string; es: string };
  shortDescription: { en: string; es: string };
  description: { en: string; es: string };
  images: string[];
  faqs: { en: { q: string; a: string }[]; es: { q: string; a: string }[] };
  variants: EditableVariant[];
  isActive: boolean;
  isPopular: boolean;
};

function jsonField<T>(fd: FormData, name: string, fallback: T): T {
  try { return JSON.parse(String(fd.get(name) ?? "")) as T; } catch { return fallback; }
}

function readProductFields(fd: FormData): ProductFields {
  const name = String(fd.get("name_en") ?? "").trim();
  const slug = String(fd.get("slug") ?? name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const variants = jsonField<EditableVariant[]>(fd, "variantsJson", []);
  const images = jsonField<string[]>(fd, "imagesJson", []);
  const faqs = jsonField<ProductFields["faqs"]>(fd, "faqsJson", { en: [], es: [] });
  const cleanVariants = variants.map((variant) => ({
    ...variant,
    sku: String(variant.sku ?? "").trim(),
    label: String(variant.label ?? "").trim(),
    concentration: String(variant.concentration ?? "").trim(),
    sizeMl: Number(variant.sizeMl),
    priceCents: Number(variant.priceCents),
    stock: Number(variant.stock),
    isActive: variant.isActive !== false,
  }));
  if (!name || !slug || !String(fd.get("sku") ?? "").trim()) throw new Error("Add a product name, URL slug, and SKU.");
  if (!cleanVariants.length || cleanVariants.some((v) => !v.sku || !v.label || !Number.isFinite(v.sizeMl) || v.sizeMl < 0 || !Number.isInteger(v.priceCents) || v.priceCents < 0 || !Number.isInteger(v.stock) || v.stock < 0)) throw new Error("Add at least one valid strength with a unique SKU, volume, price, and stock count.");
  if (new Set(cleanVariants.map((v) => v.sku)).size !== cleanVariants.length) throw new Error("Each strength needs a different SKU.");
  const allowedImages = images.filter((image) => typeof image === "string" && (image.startsWith("/") || image.startsWith("https://")));
  const cleanFaqs = {
    en: (faqs.en ?? []).filter((faq) => faq.q?.trim() && faq.a?.trim()).map((faq) => ({ q: faq.q.trim(), a: faq.a.trim() })),
    es: (faqs.es ?? []).filter((faq) => faq.q?.trim() && faq.a?.trim()).map((faq) => ({ q: faq.q.trim(), a: faq.a.trim() })),
  };
  return {
    id: String(fd.get("id") ?? "") || undefined,
    slug,
    sku: String(fd.get("sku")).trim(),
    categoryId: String(fd.get("categoryId") ?? "peptides"),
    form: String(fd.get("form") ?? "PEPTIDE"),
    name: { en: name, es: String(fd.get("name_es") ?? "").trim() },
    shortDescription: { en: String(fd.get("short_en") ?? "").trim(), es: String(fd.get("short_es") ?? "").trim() },
    description: { en: String(fd.get("description_en") ?? "").trim(), es: String(fd.get("description_es") ?? "").trim() },
    images: allowedImages,
    faqs: cleanFaqs,
    variants: cleanVariants,
    isActive: fd.get("isActive") === "on",
    isPopular: fd.get("isPopular") === "on",
  };
}

const emptySpecs = { keyPeptides: [], inci: "", skinTypes: [], texture: "", ph: "", pao: "", shelfLife: "", usage: "" };
const variantFields = (variant: EditableVariant, sortOrder: number) => ({
  sku: variant.sku,
  label: variant.label,
  concentration: variant.concentration || null,
  sizeMl: variant.sizeMl,
  priceCents: variant.priceCents,
  stock: variant.stock,
  sortOrder,
  isActive: variant.isActive,
});

export async function createProductAction(fd: FormData) {
  await guard();
  let fields: ProductFields;
  try { fields = readProductFields(fd); } catch { redirect("/admin/products/new?error=details"); }
  try {
    await db.product.create({
      data: {
        slug: fields.slug,
        sku: fields.sku,
        categoryId: fields.categoryId,
        form: fields.form,
        name: fields.name,
        shortDescription: fields.shortDescription,
        description: fields.description,
        images: fields.images,
        faqs: fields.faqs,
        specs: emptySpecs,
        relatedIds: [],
        isActive: fields.isActive,
        isPopular: fields.isPopular,
        variants: { create: fields.variants.map(variantFields) },
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") redirect("/admin/products/new?error=duplicate");
    throw error;
  }
  revalidateStore();
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function saveProductAction(fd: FormData) {
  await guard();
  let fields: ProductFields;
  try { fields = readProductFields(fd); } catch { redirect(`/admin/products/${String(fd.get("id"))}?error=details`); }
  const id = String(fd.get("id") ?? "");
  const product = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) return;

  const oldVariants = product.variants;
  const submittedIds = new Set(fields.variants.flatMap((variant) => variant.id ? [variant.id] : []));
  try {
    await db.$transaction(async (tx) => {
      if (await tx.order.count({ where: { paymentProvider: "stripe", status: { in: ["PENDING", "RESERVED"] }, items: { some: { productId: id } } } })) throw new Error("Expire or reconcile active Stripe sessions before editing this product.");
      await tx.product.update({
        where: { id },
        data: {
          researchApproved: false,
          slug: fields.slug,
          sku: fields.sku,
          categoryId: fields.categoryId,
          form: fields.form,
          name: fields.name,
          shortDescription: fields.shortDescription,
          description: fields.description,
          images: fields.images,
          faqs: fields.faqs,
          isActive: fields.isActive,
          isPopular: fields.isPopular,
        },
      });
      for (const old of oldVariants) {
        if (!submittedIds.has(old.id)) await tx.variant.update({ where: { id: old.id }, data: { isActive: false, stock: 0 } });
      }
      const existing = oldVariants.filter((variant) => submittedIds.has(variant.id));
      for (const variant of existing) await tx.variant.update({ where: { id: variant.id }, data: { sku: `hold-${variant.id}-${Date.now()}` } });
      for (const [sortOrder, variant] of fields.variants.entries()) {
        if (variant.id && submittedIds.has(variant.id)) await tx.variant.update({ where: { id: variant.id }, data: variantFields(variant, sortOrder) });
        else await tx.variant.create({ data: { ...variantFields(variant, sortOrder), productId: id } });
      }
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") redirect(`/admin/products/${id}?error=duplicate`);
    throw error;
  }

  const file = fd.get("batchPdf");
  const batchNo = String(fd.get("batchNo") ?? "").trim().toUpperCase();
  if (file instanceof File && file.size > 0 && batchNo) {
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) throw new Error("Batch report must be a PDF under 10MB");
    const safe = batchNo.replace(/[^A-Z0-9-]/g, "");
    const dir = join(process.cwd(), "public", "batch-tests");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${safe}.pdf`), Buffer.from(await file.arrayBuffer()));
    await db.batchTest.upsert({
      where: { batchNo: safe },
      create: { productId: id, batchNo: safe, labName: String(fd.get("labName") || "Independent lab"), tests: [], pdfPath: `/batch-tests/${safe}.pdf`, issuedAt: new Date() },
      update: { pdfPath: `/batch-tests/${safe}.pdf`, labName: String(fd.get("labName") || "Independent lab") },
    });
  }

  revalidateStore();
  revalidatePath(`/products/${fields.slug}`);
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}?saved=1`);
}

// --- Coupons --------------------------------------------------------------

export async function saveCouponAction(fd: FormData) {
  await guard();
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  if (!code) return;
  const type = fd.get("type") === "FIXED" ? "FIXED" : "PERCENT";
  const rawValue = Number(fd.get("value"));
  const value = type === "FIXED" ? Math.round(rawValue * 100) : Math.round(rawValue);
  const minCents = Math.round(Number(fd.get("min") ?? 0) * 100);
  const limit = String(fd.get("usageLimit") ?? "").trim();
  const data = { type, value, minCents, active: fd.get("active") === "on", usageLimit: limit ? Number(limit) : null };
  await db.coupon.upsert({ where: { code }, create: { code, ...data }, update: data });
  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(fd: FormData) {
  await guard();
  await db.coupon.delete({ where: { code: String(fd.get("code")) } }).catch(() => undefined);
  revalidatePath("/admin/coupons");
}

// --- Settings -------------------------------------------------------------

export async function saveSettingsAction(fd: FormData) {
  await guard();
  await setSetting("legalEntityName", String(fd.get("legalEntityName") ?? ""));
  await setSetting("brandName", String(fd.get("brandName") ?? ""));
  await setSetting("reservationMinutes", Math.max(1, Number(fd.get("reservationMinutes") ?? 30)));
  await setSetting("affiliatePayoutCents", Math.round(Number(fd.get("affiliatePayout") ?? 0) * 100));
  await setSetting("reviewsRating", Number(fd.get("reviewsRating") ?? 4.6));
  await setSetting("reviewsCount", Math.round(Number(fd.get("reviewsCount") ?? 0)));
  revalidateStore();
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function reconcilePaymentAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  if (!order.stripeSessionId) throw new Error("No Stripe session recorded");
  await reconcileStripeSession(await stripeClient().checkout.sessions.retrieve(order.stripeSessionId));
  revalidatePath(`/admin/orders/${id}`);
}
