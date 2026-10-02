"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { t as lt } from "@/lib/types";

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
  const name = lt(product.name, locale);

  return (
    <div className="group flex flex-col rounded-2xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-secondary">
        {product.images[0] ? <Image src={product.images[0]} alt={`${name} product packaging`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain transition-transform group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center p-5 text-center font-serif text-lg text-primary">Avion-PEPT<br /><span className="mt-2 text-sm font-sans text-muted-foreground">Product photo coming soon</span></div>}
        {product.isPopular && <Badge className="absolute left-2 top-2 uppercase tracking-wide">{t("popular")}</Badge>}
      </Link>
      <div className="mt-3 flex flex-1 flex-col px-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{lt(product.category.name, locale)}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 text-sm font-semibold leading-snug hover:underline">{name}</Link>
        <p className="mt-1 text-sm text-muted-foreground">{product.variants[0]?.label}</p>
      </div>
    </div>
  );
}
