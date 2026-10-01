import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/store/product-grid";
import { getCategories, getProducts } from "@/lib/queries";
import { toCard } from "@/lib/card";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("shop") };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, categories, products] = await Promise.all([getTranslations(), getCategories(), getProducts()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">{t("nav.shop")}</h1>
      <ProductGrid products={products.map(toCard)} categories={categories.map((c) => ({ slug: c.slug, name: c.name as Record<string, string> }))} />
    </div>
  );
}

// Catalogue is read from DB; refresh at most every 5 minutes (admin saves also revalidate).
export const revalidate = 300;
