import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/db",()=>({db:{}}));
import { getProductBySlug, getProducts } from "@/lib/queries";
import { toCard } from "@/lib/card";
afterEach(()=>vi.unstubAllEnvs());
it("keeps strength-specific photos and original catalogue prices in the v2 cards",async()=>{
 vi.stubEnv("DATABASE_URL","");
 const product=await getProductBySlug("retatrutide");
 expect(product).not.toBeNull();
 const card=toCard(product!);
 expect(card.variants[0]).toMatchObject({sku:"RET20",priceCents:24669,images:expect.arrayContaining(["/v2/retatrutide-20mg.jpg"])});
 expect(card.variants[1]).toMatchObject({sku:"RET40",priceCents:35293,images:expect.arrayContaining(["/products/retatrutide-40mg.jpeg"])});
});
it("serves active catalogue items with the supplied v2 image assets",async()=>{
 vi.stubEnv("DATABASE_URL","");
 const products=await getProducts();
 expect(products.length).toBe(9);
 expect(products.every(p=>(p.images as string[])[0].startsWith('/v2/'))).toBe(true);
});
