import { currentPurchaser } from "@/lib/purchaser-session";
import { purchaserApproved } from "@/lib/commerce-policy";
import { db } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Link } from "@/i18n/routing";
import { BROWSE_ONLY, DEMO_CHECKOUT } from "@/lib/deployment-mode";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (BROWSE_ONLY && !DEMO_CHECKOUT) {
    const t = await getTranslations("checkout");
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("browseOnly")}</p><Link href="/shop" className="mt-6 inline-block text-sm font-medium underline">{t("browseCollection")}</Link></div>;
  }
  if (!BROWSE_ONLY) {
    const purchaser = await currentPurchaser();
    const r = await getTranslations("research");
    if (!purchaserApproved(purchaser)) return <main className="mx-auto max-w-2xl space-y-4 px-4 py-16"><h1 className="text-2xl font-semibold">{r("approvalRequired")}</h1><Link href="/account" className="underline">{r("accountLink")}</Link></main>;
    const configured = await db.checkoutCurrency.findMany({ where: { enabled: true } });
    return <CheckoutForm verifiedEmail={purchaser!.email} paymentCurrencies={["EUR", ...configured.map(c => c.code)]} />;
  }
  return <CheckoutForm />;
}
