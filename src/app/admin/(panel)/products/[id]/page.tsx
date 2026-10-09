import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/lib/db";
import { saveProductAction } from "../../../actions";

export default async function AdminProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } }, batchTests: { orderBy: { issuedAt: "desc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3"><Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">← Products</Link><h1 className="text-xl font-semibold">Edit product</h1>{query.saved && <span className="rounded-full bg-accent px-2 py-0.5 text-xs">Saved</span>}</div>
    <ProductForm action={saveProductAction} categories={categories} product={{ ...product, variants: product.variants.map((variant) => ({ ...variant, sizeMl: Number(variant.sizeMl) })) }} error={query.error} />
  </div>;
}
