import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoOrderConfirmation } from "@/components/checkout/demo-order-confirmation";

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const t = await getTranslations("checkout");
  return { title: `${t("demoConfirmationTitle")} · ${orderNumber}`, robots: { index: false, follow: false } };
}

export default async function DemoOrderPage({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  return <DemoOrderConfirmation orderNumber={orderNumber} />;
}
