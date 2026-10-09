"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Link, useRouter } from "@/i18n/routing";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { shippingCost, zoneForCountry, SHIPPING_COUNTRIES } from "@/config/shipping";
import { pushEvent } from "@/components/layout/gtm";
import { BROWSE_ONLY, DEMO_CHECKOUT } from "@/lib/deployment-mode";
import { useCurrency } from "./use-currency";

export function CartDrawer() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const { items, isOpen, close, setQty, remove, couponCode, setCoupon, country } = useCart();
  const { currency } = useCurrency();
  const [code, setCode] = useState(couponCode ?? "");
  const [fetchedDiscount, setFetchedDiscount] = useState<{ code: string; cents: number } | null>(null);
  const discount = couponCode && fetchedDiscount?.code === couponCode ? fetchedDiscount.cents : 0;
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);
  const zone = zoneForCountry(country);
  const shipping = items.length ? shippingCost(country, "standard", subtotal - discount) : 0;
  const total = subtotal - discount + shipping;
  const remainingForFree = Math.max(0, zone.freeThresholdCents - (subtotal - discount));
  const countryName = SHIPPING_COUNTRIES.find((c) => c.code === country)?.name ?? country;

  useEffect(() => {
    if (!couponCode) return;
    const code = couponCode;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotalCents: subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setFetchedDiscount({ code, cents: d.discountCents });
          setCouponError(null);
        } else {
          setCoupon(null);
          setCouponError(t("invalidCoupon"));
        }
      })
      .catch(() => setFetchedDiscount(null));
  }, [couponCode, subtotal, setCoupon, t]);

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setCouponError(null);
    setCoupon(c);
  };

  const checkout = () => {
    pushEvent("begin_checkout", {
      ecommerce: {
        currency: "EUR",
        value: total / 100,
        items: items.map((i) => ({ item_id: i.variantId, item_name: i.name, item_variant: i.variantLabel, price: i.unitCents / 100, quantity: i.qty })),
      },
    });
    close();
    router.push("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? undefined : close())}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button variant="outline" onClick={close} render={<Link href="/shop" />}>
              {t("continue")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {remainingForFree > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{t("freeShippingProgress", { amount: formatMoney(remainingForFree, currency) })}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, ((subtotal - discount) / zone.freeThresholdCents) * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <p className="rounded-md bg-accent px-3 py-2 text-xs font-medium">{t("freeShippingUnlocked")}</p>
              )}

              {items.map((i) => (
                <div key={i.variantId} className="flex gap-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <Image src={i.image} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/products/${i.slug}`} onClick={close} className="text-sm font-medium hover:underline">{i.name}</Link>
                        <p className="text-xs text-muted-foreground">{i.variantLabel}</p>
                      </div>
                      <button onClick={() => remove(i.variantId)} aria-label={t("remove")} className="text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button className="px-2 py-1" aria-label="−" onClick={() => setQty(i.variantId, i.qty - 1)}><Minus className="size-3" /></button>
                        <span className="w-6 text-center text-sm">{i.qty}</span>
                        <button className="px-2 py-1" aria-label="+" onClick={() => setQty(i.variantId, i.qty + 1)}><Plus className="size-3" /></button>
                      </div>
                      <span className="text-sm font-medium">{formatMoney(i.unitCents * i.qty, currency)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Input placeholder={t("coupon")} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCode()} />
                <Button variant="outline" onClick={applyCode}>{t("apply")}</Button>
              </div>
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            </div>

            <div className="border-t px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd>{formatMoney(subtotal, currency)}</dd></div>
                {discount > 0 && (
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t("discount")} ({couponCode})</dt><dd>−{formatMoney(discount, currency)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("shippingEstimate", { country: countryName })}</dt><dd>{shipping === 0 ? t("free") : formatMoney(shipping, currency)}</dd></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-semibold"><dt>{t("total")}</dt><dd>{formatMoney(total, currency)}</dd></div>
              </dl>
              {currency !== "EUR" && <p className="mt-1 text-[11px] text-muted-foreground">Charged in EUR · {formatMoney(total, "EUR")}</p>}
              {BROWSE_ONLY && DEMO_CHECKOUT && <p className="mt-3 text-center text-xs text-muted-foreground">{t("demoCheckoutNote")}</p>}
              <Button className="mt-4 w-full" size="lg" onClick={checkout} lang={locale} disabled={BROWSE_ONLY && !DEMO_CHECKOUT}>{t("checkout")}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
