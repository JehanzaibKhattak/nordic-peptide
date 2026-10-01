"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { SHIPPING_COUNTRIES, shippingCost, zoneForCountry } from "@/config/shipping";
import { readAttribution } from "@/lib/affiliate/capture";
import type { Address } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";

const empty: Address = { firstName: "", lastName: "", line1: "", line2: "", city: "", postcode: "", country: "ES", phone: "" };

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const { items, couponCode, country, setCountry } = useCart();
  const mounted = useHydrated();
  const [email, setEmail] = useState("");
  // Ship-to country lives in the cart store (shared with header chip + drawer).
  const [shipFields, setShipFields] = useState<Address>(empty);
  const ship: Address = { ...shipFields, country };
  const setShip = (a: Address) => {
    if (a.country !== country) setCountry(a.country);
    setShipFields(a);
  };
  const [bill, setBill] = useState<Address>({ ...empty, country });
  const [billingSame, setBillingSame] = useState(true);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [agree, setAgree] = useState(false);
  const [fetchedDiscount, setFetchedDiscount] = useState<{ code: string; cents: number } | null>(null);
  const discount = couponCode && fetchedDiscount?.code === couponCode ? fetchedDiscount.cents : 0;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);
  useEffect(() => {
    if (!couponCode) return;
    const code = couponCode;
    fetch("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, subtotalCents: subtotal }) })
      .then((r) => r.json())
      .then((d) => setFetchedDiscount(d.ok ? { code, cents: d.discountCents } : null))
      .catch(() => setFetchedDiscount(null));
  }, [couponCode, subtotal]);

  const zone = zoneForCountry(ship.country);
  const shipping = shippingCost(ship.country, method, subtotal - discount);
  const total = subtotal - discount + shipping;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          email,
          shippingAddress: ship,
          billingAddress: billingSame ? ship : bill,
          shippingMethod: method,
          couponCode,
          affiliate: readAttribution(),
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "checkout_failed");
      window.location.assign(data.payUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "checkout_failed");
      setSubmitting(false);
    }
  };

  if (!mounted) return <div className="mx-auto max-w-6xl px-4 py-12"><div className="h-96 animate-pulse rounded-2xl bg-secondary" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">{tc("empty")}</p>
        <Button className="mt-6" render={<Link href="/shop" />}>{tc("continue")}</Button>
      </div>
    );
  }

  const field = (addr: Address, set: (a: Address) => void, prefix: string) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${prefix}-first`} label={t("firstName")} value={addr.firstName} onChange={(v) => set({ ...addr, firstName: v })} required />
      <Field id={`${prefix}-last`} label={t("lastName")} value={addr.lastName} onChange={(v) => set({ ...addr, lastName: v })} required />
      <Field id={`${prefix}-line1`} label={t("line1")} value={addr.line1} onChange={(v) => set({ ...addr, line1: v })} required className="sm:col-span-2" />
      <Field id={`${prefix}-line2`} label={t("line2")} value={addr.line2 ?? ""} onChange={(v) => set({ ...addr, line2: v })} className="sm:col-span-2" />
      <Field id={`${prefix}-city`} label={t("city")} value={addr.city} onChange={(v) => set({ ...addr, city: v })} required />
      <Field id={`${prefix}-postcode`} label={t("postcode")} value={addr.postcode} onChange={(v) => set({ ...addr, postcode: v })} required />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${prefix}-country`}>{t("country")}</Label>
        <select
          id={`${prefix}-country`}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={addr.country}
          onChange={(e) => set({ ...addr, country: e.target.value })}
        >
          {SHIPPING_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {prefix === "ship" && <Field id="phone" label={t("phone")} value={addr.phone ?? ""} onChange={(v) => set({ ...addr, phone: v })} type="tel" className="sm:col-span-2" />}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("step1")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" />{t("secure")}</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-semibold">{t("contact")}</h2>
            <Field id="email" label={t("email")} type="email" value={email} onChange={setEmail} required />
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">{t("shippingAddress")}</h2>
            {field(ship, setShip, "ship")}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">{t("shippingMethod")}</h2>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as "standard" | "express")} className="gap-2">
              {zone.methods.map((m) => {
                const price = shippingCost(ship.country, m.id, subtotal - discount);
                return (
                  <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 has-[[data-state=checked]]:border-primary">
                    <span className="flex items-center gap-3">
                      <RadioGroupItem value={m.id} id={`m-${m.id}`} />
                      <span>
                        <span className="text-sm font-medium">{t(m.id)}</span>
                        <span className="block text-xs text-muted-foreground">{t("eta", { min: m.etaDays[0], max: m.etaDays[1] })} · {m.carriers.join(", ")}</span>
                      </span>
                    </span>
                    <span className="text-sm font-medium">{price === 0 ? tc("free") : formatMoney(price)}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </section>

          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={billingSame} onCheckedChange={(v) => setBillingSame(Boolean(v))} />
              {t("billingSame")}
            </label>
            {!billingSame && (
              <>
                <h2 className="font-semibold">{t("billingAddress")}</h2>
                {field(bill, setBill, "bill")}
              </>
            )}
          </section>

          <section className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} required className="mt-0.5" />
              <span>
                {t("agreeTerms")} (<Link href="/legal/terms" className="underline" target="_blank">Terms</Link>, <Link href="/legal/privacy" className="underline" target="_blank">Privacy</Link>)
              </span>
            </label>
          </section>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full lg:w-auto" disabled={!agree || submitting} data-testid="continue-to-payment">
            {submitting ? t("paying") : t("continueToPayment")}
          </Button>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">{t("orderSummary")}</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.variantId} className="flex items-center gap-3 text-sm">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                    <span className="absolute -right-0 -top-0 grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{i.qty}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.variantLabel}</p>
                  </div>
                  <span>{formatMoney(i.unitCents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{tc("subtotal")}</dt><dd>{formatMoney(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{tc("discount")} ({couponCode})</dt><dd>−{formatMoney(discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">{tc("shipping")}</dt><dd>{shipping === 0 ? tc("free") : formatMoney(shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("tax")}</dt><dd>{formatMoney(0)}</dd></div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-semibold"><dt>{tc("total")}</dt><dd>{formatMoney(total)}</dd></div>
            </dl>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({
  id, label, value, onChange, type = "text", required, className,
}: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} autoComplete={id} />
    </div>
  );
}
