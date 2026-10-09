import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentPage } from "@/components/checkout/payment-page";
import { Link } from "@/i18n/routing";
import { BROWSE_ONLY, DEMO_CHECKOUT } from "@/lib/deployment-mode";
import { DemoPaymentPage } from "@/components/checkout/demo-payment-page";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("step2"), robots: { index: false } };
}

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string; demo?: string }>;
}) {
  const { locale } = await params;
  const { session, demo } = await searchParams;
  setRequestLocale(locale);
  if (BROWSE_ONLY && DEMO_CHECKOUT) return <DemoPaymentPage token={demo ?? ""} />;
  if (BROWSE_ONLY) {
    const t = await getTranslations("checkout");
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><p className="text-muted-foreground">{t("browseOnly")}</p><Link href="/shop" className="mt-6 inline-block text-sm font-medium underline">{t("browseCollection")}</Link></div>;
  }
  return <PaymentPage token={session ?? ""} />;
}
