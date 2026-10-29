import type { Address } from "@/lib/types";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ownedArgentSession } from "@/lib/payments/argent-session";
import { ArgentPayment } from "@/components/checkout/argent-payment";
import { BROWSE_ONLY } from "@/lib/deployment-mode";
import { argentConfig, argentEnabled } from "@/lib/payments/argent-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Secure payment", robots: { index: false, follow: false } };
export default async function ArgentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ session?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { session: token } = await searchParams;
  if (!token) notFound();
  const session = await ownedArgentSession(token);
  if (!session) notFound();
  const attempt = await db.argentPayment.findUnique({ where: { orderId: session.orderId } });
  return <ArgentPayment token={token} orderNumber={session.order.orderNumber} totalCents={session.order.totalCents} currency={session.order.currency} initialStatus={["PAID", "FULFILLED", "REFUNDED", "CANCELLED", "EXPIRED", "PAYMENT_FAILED"].includes(session.order.status) ? session.order.status : attempt?.status ?? session.order.status} canStart={!BROWSE_ONLY && argentEnabled()} test={!(attempt?.live ?? argentConfig()?.live)} summary={{ items: session.order.items.map(({ id, name, variantLabel, qty, lineCents }) => ({ id, name, variantLabel, qty, lineCents })), shippingAddress: session.order.shippingAddress as unknown as Address, subtotalCents: session.order.subtotalCents, discountCents: session.order.discountCents, shippingCents: session.order.shippingCents, taxCents: session.order.taxCents }} />;
}
