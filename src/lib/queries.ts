import { cache } from "react";
import type { Category, Prisma } from "@prisma/client";
import { db } from "./db";
import staticCatalog from "./static-catalog.json";

// The no-database deployment serves this bundled catalog for browsing only.
// Once DATABASE_URL is configured, all reads use the live database instead.
type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { category: true; variants: { orderBy: { sortOrder: "asc" } } };
}>;
type ProductWithDetails = Prisma.ProductGetPayload<{
  include: {
    category: true;
    variants: { orderBy: { sortOrder: "asc" } };
    batchTests: { orderBy: { issuedAt: "desc" }; take: 1 };
  };
}>;

const hasDatabase = () => Boolean(process.env.DATABASE_URL);
const categories = staticCatalog.categories as unknown as Category[];
const products = staticCatalog.products as unknown as ProductWithDetails[];

function withCatalogImages<T extends { slug: string; images: unknown; variants: { sku: string }[] }>(product: T): T {
  const catalogueProduct = staticCatalog.products.find((item) => item.slug === product.slug);
  if (!catalogueProduct) return product;

  const imagesBySku = new Map(catalogueProduct.variants.map((variant) => [variant.sku, variant.images]));
  const descriptionsBySku = new Map(catalogueProduct.variants.map((variant) => [variant.sku, variant.description]));
  return {
    ...product,
    images: catalogueProduct.images,
    description: catalogueProduct.description,
    variants: product.variants.map((variant) => ({
      ...variant,
      images: imagesBySku.get(variant.sku) ?? catalogueProduct.images,
      description: descriptionsBySku.get(variant.sku) ?? catalogueProduct.description,
    })),
  };
}

export const getCategories = cache(async (): Promise<Category[]> =>
  hasDatabase() ? db.category.findMany({ orderBy: { sortOrder: "asc" } }) : categories,
);

export const getProducts = cache(async (categorySlug?: string): Promise<ProductWithVariants[]> => {
  if (!hasDatabase()) return products.filter((p) => p.isActive && (!categorySlug || p.category.slug === categorySlug));
  const results = await db.product.findMany({
    where: { isActive: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    include: { category: true, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isPopular: "desc" }, { createdAt: "asc" }],
  });
  return results.map(withCatalogImages);
});

export const getProductBySlug = cache(async (slug: string): Promise<ProductWithDetails | null> => {
  if (!hasDatabase()) {
    const legacySlugs: Record<string, string> = {
      "retatrutide-20mg": "retatrutide",
      "retatrutide-40mg": "retatrutide",
      "tirzepatide-40mg": "tirzepatide",
      "tirzepatide-60mg": "tirzepatide",
    };
    const resolvedSlug = legacySlugs[slug] ?? slug;
    return products.find((p) => p.slug === resolvedSlug) ?? null;
  }
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      batchTests: { orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });
  return product ? withCatalogImages(product) : null;
});

export const getProductsByIds = cache(async (ids: string[]): Promise<ProductWithVariants[]> => {
  if (!ids.length) return [];
  if (!hasDatabase()) return products.filter((p) => p.isActive && ids.includes(p.id));
  const results = await db.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { category: true, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  return results.map(withCatalogImages);
});

type BatchTestWithProduct = Prisma.BatchTestGetPayload<{ include: { product: true } }>;
export const getBatchTests = cache(async (q?: string): Promise<BatchTestWithProduct[]> => {
  if (!hasDatabase()) {
    return products.flatMap((product) => product.batchTests.map((test) => ({ ...test, issuedAt: new Date(test.issuedAt), product } as BatchTestWithProduct)))
      .filter((test) => !q || test.batchNo.includes(q.toUpperCase()));
  }
  return db.batchTest.findMany({
    where: q ? { batchNo: { contains: q.toUpperCase() } } : undefined,
    include: { product: true },
    orderBy: { issuedAt: "desc" },
  });
});

export type ProductRecord = ProductWithVariants;

export function lowestPrice(p: { variants: { priceCents: number }[] }) {
  return Math.min(...p.variants.map((v) => v.priceCents));
}
