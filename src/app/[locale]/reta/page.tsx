import { argentEnabled } from "@/lib/payments/argent-config";
import { Montserrat } from "next/font/google";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getProductBySlug } from "@/lib/queries";
import { db } from "@/lib/db";
import { bankTransferConfig } from "@/lib/bank-transfer";
import { guestBankCheckoutEnabled } from "@/lib/guest-checkout";
import { BROWSE_ONLY } from "@/lib/deployment-mode";
import { RetaLanding } from "@/components/campaign/reta-landing";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-reta", display: "swap" });

export const dynamic = "force-dynamic";
export const metadata = { title: "RETA · Select your research order", description: "Explore Retatrutide Pen presentations and place a GBP bank-transfer research order with Peptbay.", robots: { index: false, follow: false }, alternates: { canonical: "/en/reta" } };

export default async function RetaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug("retatrutide");
  if (!product?.isActive) notFound();
  const currency = process.env.DATABASE_URL ? await db.checkoutCurrency.findUnique({ where: { code: "GBP" } }) : null;
  const bank = bankTransferConfig();
  const rate = currency?.enabled ? currency.eurRate : 0.8472;
  const variants = product.variants.filter(v => v.priceCents > 0).map(v => ({ id: v.id, sku: v.sku, label: v.label, priceCents: v.priceCents, stock: v.stock, images: (v as typeof v & { images?: string[] }).images ?? product.images as string[] }));
  if (!variants.length) notFound();
  return <div className={montserrat.variable}><RetaLanding product={{ id: product.id, slug: product.slug }} variants={variants} rate={rate} argentCheckout={argentEnabled()} checkoutEnabled={!BROWSE_ONLY && ((guestBankCheckoutEnabled() && bank?.currency === "GBP") || argentEnabled()) && Boolean(currency?.enabled)} /></div>;
}
