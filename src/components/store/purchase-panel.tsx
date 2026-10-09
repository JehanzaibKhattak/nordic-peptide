"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { pushEvent } from "@/components/layout/gtm";
import { useCurrency } from "./use-currency";
import { DeliveryEstimate } from "./delivery-estimate";

export type PanelVariant = { id: string; sku: string; label: string; concentration?: string | null; sizeMl: number; priceCents: number; stock: number };

export function PurchasePanel({
  product,
  variants,
  browseOnly = false,
}: {
  product: { id: string; slug: string; name: string; image: string };
  variants: PanelVariant[];
  browseOnly?: boolean;
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fmt } = useCurrency();
  const add = useCart((state) => state.add);
  const initialVariant = searchParams.get("variant");
  const initialIndex = Number(searchParams.get("Strength")) - 1;
  const [selectedSku, setSelectedSku] = useState(
    variants.find((variant) => variant.sku === initialVariant || variant.id === initialVariant)?.sku ?? variants[initialIndex]?.sku ?? variants[0]?.sku,
  );
  const [quantity, setQuantity] = useState(1);
  const selected = variants.find((variant) => variant.sku === selectedSku) ?? variants[0];
  if (!selected) return null;

  const select = (variant: PanelVariant, index: number) => {
    setSelectedSku(variant.sku);
    const params = new URLSearchParams(searchParams.toString());
    params.set("Strength", String(index + 1));
    params.set("variant", variant.sku);
    router.replace(`/products/${product.slug}?${params.toString()}`, { scroll: false });
  };

  // Browse-only mode still supports an interactive cart preview. Actual ordering
  // remains gated by stock and the server-side checkout flag.
  const canAddToCart = selected.priceCents > 0 && (browseOnly || selected.stock > 0);
  const onAdd = () => {
    if (!canAddToCart) return;
    add({ productId: product.id, variantId: selected.id, slug: product.slug, name: product.name, variantLabel: selected.label, image: product.image, unitCents: selected.priceCents }, quantity);
    pushEvent("add_to_cart", {
      ecommerce: { currency: "EUR", value: selected.priceCents * quantity / 100, items: [{ item_id: selected.sku, item_name: product.name, item_variant: selected.label, price: selected.priceCents / 100, quantity }] },
    });
    toast.success(t("added"));
  };

  return <div className="space-y-4">
    {variants.length > 1 && <section aria-label="Choose product strength">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#83907c]">{locale === "es" ? "Elige la concentración" : "Choose strength"}</h2><span className="text-xs text-muted-foreground">{locale === "es" ? "Selecciona una opción" : "Select an option"}</span></div>
      <div role="radiogroup" aria-label={locale === "es" ? "Concentración" : "Strength"} className="space-y-2">
        {variants.map((variant, index) => {
          const checked = selected.sku === variant.sku;
          const availability = variant.stock > 0 ? (locale === "es" ? "En stock" : "In stock") : (locale === "es" ? "No disponible" : "Unavailable");
          return <button key={variant.sku} type="button" role="radio" aria-checked={checked} onClick={() => select(variant, index)} className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition", checked ? "border-[#2d6047] bg-[#e9eee6] ring-1 ring-[#2d6047]" : "border-[#e8e4dc] hover:border-[#b5c2b2]")}>
            <span className="min-w-0"><span className="block text-sm font-semibold text-primary">{variant.label}</span><span className="mt-1 block text-xs text-muted-foreground">{variant.sku}{variant.concentration && <> <span className="mx-1">·</span> {variant.concentration}</>} <span className="mx-1">·</span> {availability}</span></span>
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-primary">{variant.priceCents > 0 ? fmt(variant.priceCents) : (locale === "es" ? "Precio pendiente" : "Price pending")}</span>
          </button>;
        })}
      </div>
    </section>}

    <div className="flex items-center gap-3">
      <div className="flex h-11 items-center rounded-lg border border-[#e8e4dc] bg-white">
        <button type="button" className="px-3 text-primary" aria-label={locale === "es" ? "Reducir cantidad" : "Decrease quantity"} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus className="size-3.5" /></button>
        <span className="w-6 text-center text-sm tabular-nums">{quantity}</span>
        <button type="button" className="px-3 text-primary" aria-label={locale === "es" ? "Aumentar cantidad" : "Increase quantity"} onClick={() => setQuantity((value) => Math.min(10, value + 1))}><Plus className="size-3.5" /></button>
      </div>
      <Button size="lg" className="h-11 flex-1" onClick={onAdd} disabled={!canAddToCart} data-testid="add-to-cart">
        {selected.priceCents <= 0 ? (locale === "es" ? "Precio pendiente" : "Price pending") : !browseOnly && selected.stock <= 0 ? t("outOfStock") : `${t("addToCart")} · ${fmt(selected.priceCents * quantity)}`}
      </Button>
    </div>

    {selected && <dl className="grid grid-cols-2 gap-3 rounded-lg bg-[#f3f0e8] p-3 text-xs"><div><dt className="text-muted-foreground">SKU</dt><dd className="mt-1 font-medium text-primary">{selected.sku}</dd></div><div><dt className="text-muted-foreground">{locale === "es" ? "Cantidad / volumen" : "Amount / volume"}</dt><dd className="mt-1 font-medium text-primary">{selected.label}</dd></div></dl>}
    <DeliveryEstimate />
  </div>;
}
