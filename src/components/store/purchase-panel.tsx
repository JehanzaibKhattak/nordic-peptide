"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, CheckCircle2, FlaskConical, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart-store";
import { pricePerMl } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCurrency } from "./use-currency";
import { DeliveryEstimate } from "./delivery-estimate";
import { pushEvent } from "@/components/layout/gtm";

export type PanelVariant = { id: string; label: string; sizeMl: number; priceCents: number; stock: number };

export function PurchasePanel({
  product,
  variants,
  labName,
  reviews,
}: {
  product: { id: string; slug: string; name: string; image: string; keyPeptides: string[] };
  variants: PanelVariant[];
  labName: string;
  reviews: { rating: number; count: number };
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const { fmt, currency } = useCurrency();
  const add = useCart((s) => s.add);

  const sorted = [...variants].sort((a, b) => b.sizeMl - a.sizeMl);
  const fromQuery = sp.get("variant");
  const initial = sorted.find((v) => v.id === fromQuery || v.label.replace(/\s/g, "").toLowerCase() === fromQuery?.toLowerCase()) ?? sorted.find((v) => v.stock > 0) ?? sorted[0];
  const [selected, setSelected] = useState<PanelVariant>(initial);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    pushEvent("view_item", {
      ecommerce: { currency: "EUR", value: selected.priceCents / 100, items: [{ item_id: selected.id, item_name: product.name, item_variant: selected.label, price: selected.priceCents / 100 }] },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (v: PanelVariant) => {
    setSelected(v);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", v.label.replace(/\s/g, "").toLowerCase());
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const onAdd = () => {
    if (selected.stock <= 0) return;
    add({ productId: product.id, variantId: selected.id, slug: product.slug, name: product.name, variantLabel: selected.label, image: product.image, unitCents: selected.priceCents }, qty);
    pushEvent("add_to_cart", {
      ecommerce: { currency: "EUR", value: (selected.priceCents * qty) / 100, items: [{ item_id: selected.id, item_name: product.name, item_variant: selected.label, price: selected.priceCents / 100, quantity: qty }] },
    });
    toast.success(t("added"));
  };

  const stockPill = (v: PanelVariant) =>
    v.stock <= 0 ? (
      <Badge variant="outline" className="text-muted-foreground">{t("outOfStock")}</Badge>
    ) : v.stock <= 10 ? (
      <Badge variant="outline" className="border-amber-300 text-amber-700">{t("lowStock", { n: v.stock })}</Badge>
    ) : (
      <Badge variant="outline" className="border-emerald-300 text-emerald-700">{t("inStock")}</Badge>
    );

  return (
    <>
      <div className="space-y-6">
        {variants.length > 1 || variants[0].sizeMl > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("chooseSize")}</h2>
              <SizeGuide label={t("whichSize")} />
            </div>
            <div className="space-y-2">
              {sorted.map((v) => (
                <button
                  key={v.id}
                  onClick={() => select(v)}
                  disabled={v.stock <= 0}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60",
                    selected.id === v.id ? "border-primary bg-accent/60 ring-1 ring-primary" : "hover:bg-secondary",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{v.label}</p>
                    {v.sizeMl > 0 && <p className="text-xs text-muted-foreground">{pricePerMl(v.priceCents, v.sizeMl, currency)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {stockPill(v)}
                    <span className="text-sm font-semibold tabular-nums">{fmt(v.priceCents)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-secondary/60 p-3">
            <FlaskConical className="mx-auto size-4" />
            <p className="mt-1 font-medium">{product.keyPeptides.length ? product.keyPeptides.length : "—"}</p>
            <p className="text-muted-foreground">{t("stats.peptides")}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <CheckCircle2 className="mx-auto size-4" />
            <p className="mt-1 truncate font-medium">{labName}</p>
            <p className="text-muted-foreground">{t("stats.tested")}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <Star className="mx-auto size-4" />
            <p className="mt-1 font-medium">{reviews.rating.toFixed(1)} · {reviews.count}</p>
            <p className="text-muted-foreground">{t("stats.reviews")}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center rounded-xl border">
            <button className="px-3 py-2" aria-label="−" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-4" /></button>
            <span className="w-8 text-center text-sm tabular-nums" aria-label={t("qty")}>{qty}</span>
            <button className="px-3 py-2" aria-label="+" onClick={() => setQty((q) => Math.min(10, q + 1))}><Plus className="size-4" /></button>
          </div>
          <Button size="lg" className="flex-1" onClick={onAdd} disabled={selected.stock <= 0} data-testid="add-to-cart">
            {selected.stock > 0 ? `${t("addToCart")} · ${fmt(selected.priceCents * qty)}` : t("outOfStock")}
          </Button>
        </div>

        <DeliveryEstimate />
      </div>

      {/* Sticky mobile bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">{selected.label} · {fmt(selected.priceCents)}</p>
        </div>
        <Button onClick={onAdd} disabled={selected.stock <= 0} lang={locale}>{t("addToCart")}</Button>
      </div>
      <div className="h-16 md:hidden" />
    </>
  );
}

function SizeGuide({ label }: { label: string }) {
  const t = useTranslations("product.sizeGuide");
  return (
    <Dialog>
      <DialogTrigger render={<button className="text-xs underline underline-offset-2" />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {(["a", "b", "c", "d", "e"] as const).map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
