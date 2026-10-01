import { cache } from "react";
import { db } from "./db";

// Read-side queries used by pages. All cheap indexed reads; no heavy work on page load.

export const getCategories = cache(() => db.category.findMany({ orderBy: { sortOrder: "asc" } }));

export const getProducts = cache((categorySlug?: string) =>
  db.product.findMany({
    where: { isActive: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    include: { category: true, variants: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isPopular: "desc" }, { createdAt: "asc" }],
  }),
);

export const getProductBySlug = cache((slug: string) =>
  db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      batchTests: { orderBy: { issuedAt: "desc" }, take: 1 },
    },
  }),
);

export const getProductsByIds = cache((ids: string[]) =>
  ids.length
    ? db.product.findMany({
        where: { id: { in: ids }, isActive: true },
        include: { category: true, variants: { orderBy: { sortOrder: "asc" } } },
      })
    : Promise.resolve([]),
);

export const getBatchTests = cache((q?: string) =>
  db.batchTest.findMany({
    where: q ? { batchNo: { contains: q.toUpperCase() } } : undefined,
    include: { product: true },
    orderBy: { issuedAt: "desc" },
  }),
);

export type ProductWithVariants = Awaited<ReturnType<typeof getProducts>>[number];

export function lowestPrice(p: { variants: { priceCents: number }[] }) {
  return Math.min(...p.variants.map((v) => v.priceCents));
}
