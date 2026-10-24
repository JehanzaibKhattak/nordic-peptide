"use client";
import { offlineInventoryEnabled } from "@/lib/inventory";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { BROWSE_ONLY } from "@/lib/deployment-mode";
import { pushEvent } from "@/components/layout/gtm";
import { useCurrency } from "./use-currency";
import { t as lt } from "@/lib/types";

export type CardProduct = {
  id: string;
  slug: string;
  name: Record<string, string>;
  isPopular: boolean;
  images: string[];
  category: { slug: string; name: Record<string, string> };
  variants: { id: string; sku: string; label: string; priceCents: number; stock: number; images?: string[] }[];
};

export function ProductCard({ product }: { product: CardProduct }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const add = useCart((state) => state.add);
  const { fmt } = useCurrency();
  const name = lt(product.name, locale);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const selected = product.variants.find((variant) => variant.id === variantId) ?? product.variants[0];
  const image = selected?.images?.[0] ?? product.images[0] ?? "";
  const canAdd = Boolean(selected && selected.priceCents > 0 && (BROWSE_ONLY || offlineInventoryEnabled() || selected.stock > 0));

  const addToCart = () => {
    if (!selected || !canAdd) return;
    add({ productId: product.id, variantId: selected.id, slug: product.slug, name, variantLabel: selected.label, image, unitCents: selected.priceCents });
    pushEvent("add_to_cart", {
      ecommerce: { currency: "EUR", value: selected.priceCents / 100, items: [{ item_id: selected.sku, item_name: name, item_variant: selected.label, price: selected.priceCents / 100, quantity: 1 }] },
    });
    toast.success(t("added"));
  };

  return (
    <div className="pb-card group flex flex-col rounded-2xl border bg-card p-3">
      <Link href={`/products/${product.slug}`} className="pb-card-image relative block aspect-square overflow-hidden rounded-xl bg-secondary">
        {image ? <Image src={image} alt={`${name} product packaging`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain transition-transform group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center p-5 text-center font-serif text-lg text-primary">Peptbay<br /><span className="mt-2 text-sm font-sans text-muted-foreground">Product photo coming soon</span></div>}
        {product.isPopular && <Badge className="absolute left-2 top-2 uppercase tracking-wide">{t("popular")}</Badge>}
      </Link>
      <div className="pb-card-body mt-3 flex flex-1 flex-col px-1">
        <div className="pb-card-heading"><Link href={`/products/${product.slug}`} className="pb-card-name mt-1 text-sm font-semibold hover:underline">{name}</Link><span className="shrink-0 text-sm font-semibold text-primary">{selected?.priceCents ? fmt(selected.priceCents) : "—"}</span></div>
        <p className="pb-card-meta text-xs text-muted-foreground">{selected?.sku} · {lt(product.category.name, locale)}</p>
        {selected && <div className="mt-auto pt-3">
          {product.variants.length > 1 && <label className="mb-2 block">
            <span className="sr-only">{locale === "es" ? "Elige la concentración" : "Choose strength"}</span>
            <select value={selected.id} onChange={(event) => setVariantId(event.target.value)} className="h-9 w-full rounded-md border border-[#e8e4dc] bg-white px-2 text-xs text-primary">
              {product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
            </select>
          </label>}
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">

            <Button size="sm" className="w-full sm:w-auto" onClick={addToCart} disabled={!canAdd} aria-label={`${t("addToCart")}: ${name}, ${selected.label}`}>
              {canAdd ? t("addToCart") : t("outOfStock")}
            </Button>
          </div>
        </div>}
      </div>
    </div>
  );
}
