import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/store/product-grid";
import { getCategories, getProducts } from "@/lib/queries";
import { toCard } from "@/lib/card";
import { t as lt } from "@/lib/types";

type Props = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  return { title: cat ? lt(cat.name, locale) : "Shop" };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const products = await getProducts(category);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">{lt(cat.name, locale)}</h1>
      <ProductGrid products={products.map(toCard)} categories={[]} filterable={false} />
    </div>
  );
}
