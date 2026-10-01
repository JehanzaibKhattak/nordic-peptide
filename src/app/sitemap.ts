import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/articles";
import { LOCALES } from "@/lib/types";
import { getCategories, getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.STORE_BASE_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  const paths: { path: string; lastModified?: Date }[] = [
    { path: "" },
    { path: "/shop" },
    { path: "/testing" },
    { path: "/journal" },
    { path: "/contact" },
    ...["terms", "privacy", "shipping", "refunds", "cookies"].map((p) => ({ path: `/legal/${p}` })),
    ...categories.map((c) => ({ path: `/shop/${c.slug}` })),
    ...products.map((p) => ({ path: `/products/${p.slug}` })),
    ...listArticles("en").map((a) => ({ path: `/journal/${a.slug}` })),
  ];
  return paths.flatMap(({ path, lastModified }) =>
    LOCALES.map((l) => ({
      url: `${base}/${l}${path}`,
      lastModified,
      alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${base}/${x}${path}`])) },
    })),
  );
}
