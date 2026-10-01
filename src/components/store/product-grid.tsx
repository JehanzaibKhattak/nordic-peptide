"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ProductCard, type CardProduct } from "./product-card";
import { t as lt } from "@/lib/types";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: Record<string, string> };

export function ProductGrid({
  products,
  categories,
  filterable = true,
  limit,
}: {
  products: CardProduct[];
  categories: Cat[];
  filterable?: boolean;
  limit?: number;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [active, setActive] = useState<string>("all");
  const shown = (active === "all" ? products : products.filter((p) => p.category.slug === active)).slice(0, limit);

  return (
    <div>
      {filterable && (
        <div className="mb-7 flex flex-nowrap gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ slug: "all", name: { en: t("all") } }, ...categories].map((c) => (
            <button
              key={c.slug}
              onClick={() => setActive(c.slug)}
              className={cn(
                "shrink-0 rounded-full border border-[#e7dfd0] bg-white/75 px-4 py-2 text-sm font-medium text-[#7a897c] transition-colors hover:bg-white",
                active === c.slug && "border-primary bg-[#e7e5d8] text-primary",
              )}
            >
              {c.slug === "all" ? <><span aria-hidden="true">⚗️</span> {t("all")}</> : lt(c.name, locale)}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
