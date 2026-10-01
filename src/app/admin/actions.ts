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
  const adapter = order.paymentProvider ? getAdapter(order.paymentProvider) : undefined;
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
  await markRefunded(id, "admin");
  revalidateStore();
  revalidatePath(`/admin/orders/${id}`);
}

export async function cancelAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  await cancelOrder(id);
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

export async function saveProductAction(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const product = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) return;

  const name = { ...(product.name as object), en: String(fd.get("name_en")), es: String(fd.get("name_es")) };
  const shortDescription = { ...(product.shortDescription as object), en: String(fd.get("short_en")), es: String(fd.get("short_es")) };
  await db.product.update({
    where: { id },
    data: { name, shortDescription, isActive: fd.get("isActive") === "on", isPopular: fd.get("isPopular") === "on" },
  });
  for (const v of product.variants) {
    const price = Math.round(Number(fd.get(`price_${v.id}`)) * 100);
    const stock = Number(fd.get(`stock_${v.id}`));
    if (Number.isFinite(price) && Number.isFinite(stock) && price >= 0 && stock >= 0) {
      await db.variant.update({ where: { id: v.id }, data: { priceCents: price, stock: Math.floor(stock), label: String(fd.get(`label_${v.id}`) ?? v.label) } });
    }
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
