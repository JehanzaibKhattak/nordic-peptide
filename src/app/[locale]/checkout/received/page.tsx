import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { currentPurchaser } from "@/lib/purchaser-session";
import { db } from "@/lib/db";
import { avionEnabled } from "@/lib/avion";
import { formatOrderMoney } from "@/lib/money";
import { AvionContinueShopping } from "@/components/checkout/avion-continue-shopping";

export const metadata = { title: "Order received", robots: { index: false } };

export default async function ReceivedPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ session?: string }> }) {
  const { locale } = await params;
  const { session } = await searchParams;
  setRequestLocale(locale);
  if (!avionEnabled() || !session) notFound();
  const purchaser = await currentPurchaser();
  if (!purchaser) notFound();
  const checkout = await db.checkoutSession.findUnique({ where: { token: session }, include: { order: { include: { events: { where: { type: { in: ["avion.synced", "avion.pending", "avion.failed", "bank_transfer.instructions"] } }, orderBy: { createdAt: "asc" } } } } } });
  if (!checkout || checkout.order.purchaserId !== purchaser.id) notFound();
  const t = await getTranslations("checkout");
  const order = checkout.order;
  if (!order.events.some(event => event.type === "avion.pending")) notFound();
  const receipt = order.events.find(event => event.type === "avion.synced")?.payload as { orderNumber: string } | undefined;
  const bank = order.events.find(event => event.type === "bank_transfer.instructions")?.payload as { instructions: string; reference: string; deadline: string } | undefined;
  const failed = order.events.some(event => event.type === "avion.failed");
  return <section className="mx-auto max-w-2xl space-y-5 px-5 py-16 text-center">
    <h1 className="font-serif text-3xl text-[#173b2e]">{t(receipt ? "avionReceived" : "avionPending")}</h1>
    <p className="text-xl font-semibold">{receipt?.orderNumber ?? order.orderNumber}</p>
    <p>{t(receipt ? "avionReceivedBody" : failed ? "avionReviewBody" : "avionPendingBody")}</p>
    <p className="font-semibold">{formatOrderMoney(order.totalCents, order.currency)}</p>
    {bank ? <div className="space-y-3 rounded-xl border p-5 text-left">
      <h2 className="font-semibold">{order.status === "PENDING" || order.status === "RESERVED" ? "Awaiting payment — Bank Transfer" : `Order status: ${order.status}`}</h2>
      {(order.status === "PENDING" || order.status === "RESERVED") && <>
        <p>Use reference <strong>{bank.reference}</strong>. Payment deadline: {new Date(bank.deadline).toUTCString()}.</p>
        <p className="whitespace-pre-line">{bank.instructions}</p>
        <p>Dispatch starts only after our team confirms receipt of payment.</p>
      </>}
    </div> : <p>{t("avionNoCharge")}</p>}
    {!receipt && <a href={`/${locale}/checkout/received?session=${encodeURIComponent(session)}`} className="block underline">{t("avionCheckStatus")}</a>}
    <AvionContinueShopping label={t("browseCollection")} />
  </section>;
}
