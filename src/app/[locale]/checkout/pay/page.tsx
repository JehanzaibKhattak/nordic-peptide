import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentPage } from "@/components/checkout/payment-page";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("step2"), robots: { index: false } };
}

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { locale } = await params;
  const { session } = await searchParams;
  setRequestLocale(locale);
  return <PaymentPage token={session ?? ""} />;
}
