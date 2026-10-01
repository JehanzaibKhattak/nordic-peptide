import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Link } from "@/i18n/routing";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (BROWSE_ONLY) {
    const t = await getTranslations("checkout");
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("browseOnly")}</p><Link href="/shop" className="mt-6 inline-block text-sm font-medium underline">{t("browseCollection")}</Link></div>;
  }
  return <CheckoutForm />;
}
