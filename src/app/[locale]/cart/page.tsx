"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Link, useRouter } from "@/i18n/routing";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { useCurrency } from "@/components/store/use-currency";
import { useHydrated } from "@/lib/use-hydrated";
import { shippingCost, SHIPPING_COUNTRIES } from "@/config/shipping";
import { BROWSE_ONLY, DEMO_CHECKOUT } from "@/lib/deployment-mode";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const t = useTranslations("cart");
  const tc = useTranslations("checkout");
  const router = useRouter();
  const hydrated = useHydrated();
  const { currency, fmt } = useCurrency();
  const { items, couponCode, setCoupon, setQty, remove, country } = useCart();
  const [code, setCode] = useState(couponCode ?? "");
  const [fetchedDiscount, setFetchedDiscount] = useState<{ code: string; cents: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const subtotal = cartSubtotal(items);
  const discount = couponCode && fetchedDiscount?.code === couponCode ? fetchedDiscount.cents : 0;
  const shipping = items.length ? shippingCost(country, "standard", subtotal - discount) : 0;
  const total = subtotal - discount + shipping;
  const countryName = SHIPPING_COUNTRIES.find((c) => c.code === country)?.name ?? country;

  useEffect(() => {
    if (BROWSE_ONLY || !couponCode) {
      setFetchedDiscount(null);
      return;
    }
    const activeCode = couponCode;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: activeCode, subtotalCents: subtotal }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          setFetchedDiscount({ code: activeCode, cents: data.discountCents });
          setCouponError(null);
        } else {
          setCoupon(null);
          setCouponError(t("invalidCoupon"));
        }
      })
      .catch(() => setFetchedDiscount(null));
  }, [couponCode, subtotal, setCoupon, t]);

  const applyCode = () => {
    const nextCode = code.trim().toUpperCase();
    if (!nextCode) return;
    setCouponError(null);
    setCoupon(nextCode);
  };

  if (!hydrated) return <div className="mx-auto max-w-6xl px-4 py-12"><div className="h-80 animate-pulse rounded-2xl bg-secondary" /></div>;

  if (items.length === 0) return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <ShoppingBag aria-hidden="true" className="mx-auto size-10 text-[#708477]" />
      <h1 className="mt-4 font-serif text-3xl font-semibold text-[#18382b]">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("empty")}</p>
      <Button className="mt-6" render={<Link href="/shop" />}>{t("continue")}</Button>
    </main>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#82917f]">Avion-PEPT</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[#18382b]">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("itemCount", { count: items.reduce((count, item) => count + item.qty, 0) })}</p>
        </div>
        <Button variant="outline" render={<Link href="/shop" />}>{t("continue")}</Button>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <section className="divide-y rounded-2xl border bg-white px-4 sm:px-6" aria-label={t("title")}>
          {items.map((item) => (
            <article key={item.variantId} className="flex gap-4 py-5 sm:gap-6">
              <Link href={`/products/${item.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#f6f4ef] sm:size-32">
                <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 96px, 128px" className="object-contain p-2" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <Link href={`/products/${item.slug}`} className="font-semibold text-[#203c30] hover:underline">{item.name}</Link>
                  <p className="mt-1 text-sm text-muted-foreground">{item.variantLabel}</p>
                  <p className="mt-2 text-sm font-medium">{fmt(item.unitCents)}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex h-9 items-center rounded-lg border border-[#e8e4dc]">
                    <button type="button" className="px-2.5 text-primary" aria-label={t("decreaseQuantity")} onClick={() => setQty(item.variantId, item.qty - 1)}><Minus className="size-3.5" /></button>
                    <span className="min-w-7 text-center text-sm tabular-nums">{item.qty}</span>
                    <button type="button" className="px-2.5 text-primary" aria-label={t("increaseQuantity")} onClick={() => setQty(item.variantId, Math.min(10, item.qty + 1))}><Plus className="size-3.5" /></button>
                  </div>
                  <span className="min-w-20 text-right text-sm font-semibold tabular-nums">{fmt(item.unitCents * item.qty)}</span>
                  <button type="button" onClick={() => remove(item.variantId)} aria-label={`${t("remove")} ${item.name}`} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="rounded-2xl border bg-white p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="font-semibold text-[#203c30]">{tc("orderSummary")}</h2>
          {!BROWSE_ONLY && <>
            <div className="mt-4 flex gap-2">
              <Input aria-label={t("coupon")} placeholder={t("coupon")} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyCode()} />
              <Button variant="outline" onClick={applyCode}>{t("apply")}</Button>
            </div>
            {couponError && <p role="alert" className="mt-2 text-xs text-destructive">{couponError}</p>}
          </>}
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd>{fmt(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("discount")} ({couponCode})</dt><dd>−{fmt(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("shippingEstimate", { country: countryName })}</dt><dd>{shipping === 0 ? t("free") : fmt(shipping)}</dd></div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-semibold"><dt>{t("total")}</dt><dd>{fmt(total)}</dd></div>
          </dl>
          {currency !== "EUR" && <p className="mt-2 text-[11px] text-muted-foreground">Charged in EUR · {formatMoney(total, "EUR")}</p>}
          {BROWSE_ONLY && DEMO_CHECKOUT && <p className="mt-4 rounded-lg bg-[#edf1e9] px-3 py-2 text-xs text-[#435d4e]">{t("demoCheckoutNote")}</p>}
          <Button className="mt-4 w-full" size="lg" disabled={BROWSE_ONLY && !DEMO_CHECKOUT} onClick={() => router.push("/checkout")}>{t("checkout")}</Button>
        </aside>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">{t("shippingEstimate", { country: countryName })}</p>
    </main>
  );
}
