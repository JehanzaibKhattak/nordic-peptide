"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { t as lt } from "@/lib/types";
import { useCurrency } from "./use-currency";
import { pushEvent } from "@/components/layout/gtm";

export type CardProduct = {
  id: string;
  slug: string;
  name: Record<string, string>;
  isPopular: boolean;
  images: string[];
  category: { slug: string; name: Record<string, string> };
  variants: { id: string; label: string; priceCents: number; stock: number }[];
};

export function ProductCard({ product }: { product: CardProduct }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const { fmt } = useCurrency();
  const add = useCart((s) => s.add);

  const inStock = product.variants.filter((v) => v.stock > 0);
  const cheapest = [...(inStock.length ? inStock : product.variants)].sort((a, b) => a.priceCents - b.priceCents)[0];
  const name = lt(product.name, locale);
  const multi = product.variants.length > 1;

  const onAdd = () => {
    if (!cheapest || cheapest.stock <= 0) return;
    add({
      productId: product.id,
      variantId: cheapest.id,
      slug: product.slug,
      name,
      variantLabel: cheapest.label,
      image: product.images[0],
      unitCents: cheapest.priceCents,
    });
    pushEvent("add_to_cart", {
      ecommerce: { currency: "EUR", value: cheapest.priceCents / 100, items: [{ item_id: cheapest.id, item_name: name, item_variant: cheapest.label, price: cheapest.priceCents / 100, quantity: 1 }] },
    });
    toast.success(t("added"));
  };

  return (
    <div className="group flex flex-col rounded-2xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-secondary">
        <Image src={product.images[0]} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform group-hover:scale-[1.03]" />
        {product.isPopular && <Badge className="absolute left-2 top-2 uppercase tracking-wide">{t("popular")}</Badge>}
      </Link>
      <div className="mt-3 flex flex-1 flex-col px-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{lt(product.category.name, locale)}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 text-sm font-semibold leading-snug hover:underline">{name}</Link>
        <p className="mt-1 text-sm text-muted-foreground">{multi ? t("from", { price: fmt(cheapest.priceCents) }) : fmt(cheapest.priceCents)}</p>
        <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={onAdd} disabled={!cheapest || cheapest.stock <= 0}>
          {cheapest && cheapest.stock > 0 ? t("addToCart") : t("outOfStock")}
        </Button>
      </div>
    </div>
  );
}
