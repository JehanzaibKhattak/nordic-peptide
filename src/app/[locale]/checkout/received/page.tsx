import { BankTransferReceipt } from "@/components/checkout/bank-transfer-receipt";
import { bankTransferOverdue } from "@/lib/bank-transfer";
import { guestCheckoutId, guestOwnerMatches } from "@/lib/guest-checkout";
import { expireStaleOrders } from "@/lib/orders";
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
  await expireStaleOrders();
  const checkout = await db.checkoutSession.findUnique({ where: { token: session }, include: { order: { include: { items: true, events: { where: { type: { in: ["avion.synced", "avion.pending", "avion.failed", "bank_transfer.instructions", "guest.owner"] } }, orderBy: { createdAt: "asc" } } } } } });
  if (!checkout) notFound();
  const guestOwner = checkout.order.events.find(event => event.type === "guest.owner");
  const ownsGuestOrder = checkout.order.purchaserId === null && guestOwnerMatches(guestOwner?.payload, await guestCheckoutId());
  if (!ownsGuestOrder && (!purchaser || checkout.order.purchaserId !== purchaser.id)) notFound();
  const t = await getTranslations("checkout");
  const order = checkout.order;
  if (!order.events.some(event => event.type === "avion.pending")) notFound();
  const receipt = order.events.find(event => event.type === "avion.synced")?.payload as { orderNumber: string } | undefined;
  const bank = order.events.find(event => event.type === "bank_transfer.instructions")?.payload as { instructions: string; reference: string; deadline: string } | undefined;
  const bankOverdue = bank && bankTransferOverdue(bank.deadline);
  const failed = order.events.some(event => event.type === "avion.failed");
  if (bank) return <BankTransferReceipt order={order} bank={bank} overdue={Boolean(bankOverdue)} backendNumber={receipt?.orderNumber} syncPending={!receipt} refreshUrl={`/${locale}/checkout/received?session=${encodeURIComponent(session)}`} />;
  return <section className="mx-auto max-w-2xl space-y-5 px-5 py-16 text-center">
    <h1 className="font-serif text-3xl text-[#173b2e]">{t(receipt ? "avionReceived" : "avionPending")}</h1>
    <p className="text-xl font-semibold">{receipt?.orderNumber ?? order.orderNumber}</p>
    <p>{t(receipt ? "avionReceivedBody" : failed ? "avionReviewBody" : "avionPendingBody")}</p>
    <p className="font-semibold">{formatOrderMoney(order.totalCents, order.currency)}</p>
    <p>{t("avionNoCharge")}</p>
    {!receipt && <a href={`/${locale}/checkout/received?session=${encodeURIComponent(session)}`} className="block underline">{t("avionCheckStatus")}</a>}
    <AvionContinueShopping label={t("browseCollection")} />
  </section>;
}
