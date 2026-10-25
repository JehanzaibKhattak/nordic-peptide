"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ProductCard, type CardProduct } from "./product-card";
import { t as lt } from "@/lib/types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: Record<string, string> };

export function ProductGrid({
  products,
  categories,
  filterable = true,
  limit,
  heading,
  shopLink = false,
}: {
  products: CardProduct[];
  categories: Cat[];
  filterable?: boolean;
  limit?: number;
  heading?: string;
  shopLink?: boolean;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [active, setActive] = useState<string>("all");
  const shown = (active === "all" ? products : products.filter((p) => p.category.slug === active)).slice(0, limit);

  return (
    <div>
      <div className="pb-grid-top">
        {heading && <div><h2 className="pb-title">{heading}</h2></div>}
        {filterable && <div className="flex max-w-full flex-wrap items-center gap-5"><div className="pb-filter" role="group" aria-label="Filter products">
          {[{ slug: "all", name: { en: t("all") } }, ...categories].map((c) => (
            <button
              key={c.slug}
              aria-pressed={active === c.slug}
              onClick={() => setActive(c.slug)}
              className={cn(
                "shrink-0 rounded-full border border-[#e7dfd0] bg-white/75 px-4 py-2 text-sm font-medium text-[#7a897c] transition-colors hover:bg-white",
                active === c.slug && "border-primary bg-[#e7e5d8] text-primary",
              )}
            >
              {c.slug === "all" ? t("all") : lt(c.name, locale)}
            </button>
          ))}
        </div>{shopLink && <Link href="/shop" className="text-sm font-medium">All products →</Link>}</div>}
      </div>
      <div className="pb-product-grid">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
