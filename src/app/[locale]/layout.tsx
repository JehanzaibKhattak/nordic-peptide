import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { Gtm } from "@/components/layout/gtm";
import { AffiliateCapture } from "@/lib/affiliate/capture";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Toaster } from "@/components/ui/sonner";
import { getProducts } from "@/lib/queries";
import { LOCALES } from "@/lib/types";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  const base = process.env.STORE_BASE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: `${t("name")} — ${t("tagline")}`, template: `%s · ${t("name")}` },
    description: t("tagline"),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: { siteName: t("name"), type: "website", locale },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const products = await getProducts();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <Gtm id={process.env.GTM_ID} />
          <AffiliateCapture />
          <Header />
          <main className="min-h-[60dvh]">{children}</main>
          <Footer products={products.map((p) => ({ sku: p.sku, slug: p.slug, name: p.name as Record<string, string>, variants: p.variants.map((v) => ({ label: v.label })) }))} />
          <WhatsAppButton phone={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "447706548345"} />
          <CartDrawer />
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
