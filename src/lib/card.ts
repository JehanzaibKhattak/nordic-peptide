import type { CardProduct } from "@/components/store/product-card";
import type { getProducts } from "./queries";

export function toCard(p: Awaited<ReturnType<typeof getProducts>>[number]): CardProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name as Record<string, string>,
    isPopular: p.isPopular,
    images: p.images as string[],
    category: { slug: p.category.slug, name: p.category.name as Record<string, string> },
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, priceCents: v.priceCents, stock: v.stock })),
  };
}
