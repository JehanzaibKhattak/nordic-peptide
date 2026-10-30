import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/db",()=>({db:{}}));
import { getProductBySlug, getProducts } from "@/lib/queries";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { toCard } from "@/lib/card";
afterEach(()=>vi.unstubAllEnvs());
it("keeps strength-specific photos and original catalogue prices in the v2 cards",async()=>{
 vi.stubEnv("DATABASE_URL","");
 const product=await getProductBySlug("retatrutide");
 expect(product).not.toBeNull();
 const card=toCard(product!);
 expect(card.variants[0]).toMatchObject({sku:"RET20",priceCents:24669,images:expect.arrayContaining(["/products/20261028/retatrutide-20mg/1.jpg"])});
 expect(card.variants[1]).toMatchObject({sku:"RET40",priceCents:35293,images:expect.arrayContaining(["/products/20261028/retatrutide-40mg/1.jpg"])});
});
it("serves active catalogue items with the supplied image assets",async()=>{
 vi.stubEnv("DATABASE_URL","");
 const products=await getProducts();
 expect(products.length).toBe(9);
 for (const product of products) {
  for (const image of product.images as string[]) expect(existsSync(join(process.cwd(), "public", image))).toBe(true);
  if (product.slug !== "bpc-157-10mg") expect(product.images).toHaveLength(6);
 }
});
