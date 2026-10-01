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
        <div className="mb-6 flex flex-wrap gap-2">
          {[{ slug: "all", name: { en: t("all") } }, ...categories].map((c) => (
            <button
              key={c.slug}
              onClick={() => setActive(c.slug)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                active === c.slug ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              {c.slug === "all" ? t("all") : lt(c.name, locale)}
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
