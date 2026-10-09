import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/lib/db";
import { createProductAction } from "../../../actions";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, categories] = await Promise.all([searchParams, db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">← Products</Link><h1 className="text-xl font-semibold">Add product</h1></div>
    <ProductForm action={createProductAction} categories={categories} error={error} />
  </div>;
}
