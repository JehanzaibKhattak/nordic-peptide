import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { OrderStatus } from "@/components/checkout/order-status";
import type { Address } from "@/lib/types";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const t = await getTranslations("order");
  return { title: t("title", { number: orderNumber }), robots: { index: false } };
}

export default async function OrderPage({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  if (BROWSE_ONLY) notFound();
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  await expireStaleOrders();
  const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true, sessions: { where: { status: "OPEN" }, take: 1 } } });
  if (!order) notFound();

  return (
    <OrderStatus
      initial={{
        orderNumber: order.orderNumber,
        status: order.status,
        email: order.email,
        totalCents: order.totalCents,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        discountCents: order.discountCents,
        trackingNo: order.trackingNo,
        shippingAddress: order.shippingAddress as Address,
        items: order.items.map((i) => ({ id: i.id, name: i.name, variantLabel: i.variantLabel, variantId: i.variantId, image: i.image, qty: i.qty, unitCents: i.unitCents, lineCents: i.lineCents })),
        payToken: order.sessions[0]?.token ?? null,
      }}
    />
  );
}
