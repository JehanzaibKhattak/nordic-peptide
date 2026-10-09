import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { currentPurchaser } from "@/lib/purchaser-session";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";

export async function CheckoutResult({ locale, token, kind }: { locale: string; token?: string; kind: "success" | "cancel" | "failure" }) {
  setRequestLocale(locale);
  const t = await getTranslations("research");
  const purchaser = await currentPurchaser();
  if (!purchaser) return <main className="mx-auto max-w-xl px-4 py-16"><Link href="/account" className="underline">{t("signIn")}</Link></main>;
  const session = token ? await db.checkoutSession.findUnique({ where: { token }, include: { order: true } }) : null;
  if (!session || session.order.purchaserId !== purchaser.id) notFound();
  return <main className="mx-auto max-w-xl space-y-5 px-4 py-16"><h1 className="text-3xl font-semibold">{t(kind)}</h1><p>{t(`${kind}Body`)}</p><p>{session.order.orderNumber} · {session.order.status}</p><Link href={`/order/${session.order.orderNumber}`} className="block underline">{t("viewOrder")}</Link><Link href="/account" className="block underline">{t("history")}</Link></main>;
}
