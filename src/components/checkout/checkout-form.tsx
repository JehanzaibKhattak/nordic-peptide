"use client";

import { CheckoutTrust } from "@/components/store/checkout-trust";
import { PaymentLogos } from "@/components/store/payment-logos";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, CreditCard, Home, Lock, Package, ShieldCheck, ShoppingCart, Tag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatOrderMoney, formatMoney } from "@/lib/money";
import { SHIPPING_COUNTRIES, BILLING_COUNTRIES, UK_ONLY_SHIPPING, shippingAllowed, shippingCost, zoneForCountry } from "@/config/shipping";
import { readAttribution } from "@/lib/affiliate/capture";
import type { Address } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { useCurrency } from "@/components/store/use-currency";
import { BROWSE_ONLY, DEMO_CHECKOUT } from "@/lib/deployment-mode";
import { saveDemoCheckout } from "@/lib/demo-checkout";

const empty: Address = { firstName: "", lastName: "", line1: "", line2: "", city: "", postcode: "", country: UK_ONLY_SHIPPING ? "GB" : "ES", phone: "" };

export function CheckoutForm({ verifiedEmail = "", paymentCurrencies = ["EUR"], paymentRates = { EUR: 1 }, avionCheckout = false, bankCurrency = null, guestBankCheckout = false }: { verifiedEmail?: string; paymentCurrencies?: string[]; paymentRates?: Record<string, number>; avionCheckout?: boolean; bankCurrency?: string | null; guestBankCheckout?: boolean }) {
  const r = useTranslations("research");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">(guestBankCheckout ? "bank_transfer" : "card");
  const [paymentCurrency, setPaymentCurrency] = useState(guestBankCheckout ? bankCurrency ?? "GBP" : "EUR");
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const { items, couponCode, setCoupon, country, setCountry } = useCart();
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [code, setCode] = useState(couponCode ?? "");
  const [couponError, setCouponError] = useState("");
  const { currency, fmt: displayMoney } = useCurrency();
  const chargedCurrency = avionCheckout && paymentCurrencies.includes(currency) ? currency : paymentCurrency;
  const rate = paymentRates[chargedCurrency] ?? 1;
  const fmt = (cents: number) => avionCheckout ? formatOrderMoney(Math.round(cents * rate), chargedCurrency) : displayMoney(cents);
  const checkoutRequest = useRef<{ body: string; id: string } | null>(null);
  const mounted = useHydrated();
  const [email, setEmail] = useState(verifiedEmail);
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
      .then((d) => {
        setFetchedDiscount(d.ok ? { code, cents: d.discountCents } : null);
        setCouponError(d.ok ? "" : tc("invalidCoupon"));
      })
      .catch(() => setFetchedDiscount(null));
  }, [couponCode, subtotal, tc]);

  const zone = zoneForCountry(ship.country);
  const shipping = shippingCost(ship.country, method, subtotal - discount);
  const total = subtotal - discount + shipping;
  const pricedSubtotal = items.reduce((sum, item) => sum + Math.round(item.unitCents * rate) * item.qty, 0);
  const formattedSubtotal = avionCheckout ? formatOrderMoney(pricedSubtotal, chargedCurrency) : fmt(subtotal);
  const formattedTotal = avionCheckout ? formatOrderMoney(pricedSubtotal - Math.round(discount * rate) + Math.round(shipping * rate), chargedCurrency) : fmt(total);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (paymentMethod === "bank_transfer" && !(BROWSE_ONLY && DEMO_CHECKOUT) && bankCurrency !== chargedCurrency) { setError(t("bankTransferUnavailable")); return; }

    if (BROWSE_ONLY && DEMO_CHECKOUT) {
      const token = crypto.randomUUID();
      saveDemoCheckout({
        token,
        paymentMethod,
        locale,
        email,
        shippingAddress: ship,
        billingAddress: billingSame ? ship : bill,
        shippingMethod: method,
        couponCode,
        subtotalCents: subtotal,
        discountCents: discount,
        shippingCents: shipping,
        totalCents: total,
        items,
      });
      router.push(`/checkout/pay?demo=${encodeURIComponent(token)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        locale, currency: chargedCurrency, paymentMethod, email, shippingAddress: ship,
        billingAddress: billingSame ? ship : bill, shippingMethod: method,
        couponCode, affiliate: readAttribution(),
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      };
      const body = JSON.stringify(payload);
      const stored = sessionStorage.getItem("avion-checkout-request");
      if (!checkoutRequest.current && stored) {
        try { checkoutRequest.current = JSON.parse(stored); } catch { /* An invalid saved request is replaced below. */ }
      }
      if (!checkoutRequest.current || checkoutRequest.current.body !== body) {
        checkoutRequest.current = { body, id: crypto.randomUUID() };
        sessionStorage.setItem("avion-checkout-request", JSON.stringify(checkoutRequest.current));
      }
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, checkoutId: checkoutRequest.current.id }),
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

  const nextStep = (section: HTMLFieldSetElement) => {
    for (const input of section.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) {
      if (!input.reportValidity()) return;
    }
    if (step === 2 && !shippingAllowed(ship.country, method, ship.postcode)) {
      setError("Delivery is currently available to Great Britain addresses only.");
      return;
    }
    setError(null);
    setStep(step + 1);
  };
  const applyCode = () => {
    const nextCode = code.trim().toUpperCase();
    if (!nextCode) return;
    setCouponError("");
    setCoupon(nextCode);
  };
  const countryName = SHIPPING_COUNTRIES.find((c) => c.code === ship.country)?.name ?? ship.country;
  const buttonClass = "h-12 min-w-0 w-full whitespace-normal leading-tight rounded-[10px] bg-[#2d5b40] font-semibold text-white hover:bg-[#234832] disabled:bg-[#d7dbce] disabled:text-[#9eaf97] disabled:opacity-100";
  const detailsComplete = Boolean(email.trim() && ship.firstName.trim() && ship.lastName.trim());
  const shippingComplete = Boolean(ship.line1.trim() && ship.city.trim() && ship.postcode.trim() && (billingSame || (bill.firstName.trim() && bill.lastName.trim() && bill.line1.trim() && bill.city.trim() && bill.postcode.trim())));

  const addressFields = (addr: Address, set: (a: Address) => void, prefix: string) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {prefix === "bill" && <>
        <Field id="bill-first" label={t("firstName")} value={addr.firstName} onChange={(v) => set({ ...addr, firstName: v })} required />
        <Field id="bill-last" label={t("lastName")} value={addr.lastName} onChange={(v) => set({ ...addr, lastName: v })} required />
      </>}
      <Field id={`${prefix}-line1`} label={t("line1")} placeholder={t("addressPlaceholder")} value={addr.line1} onChange={(v) => set({ ...addr, line1: v })} required className="sm:col-span-2" />
      <Field id={`${prefix}-line2`} label={t("line2")} placeholder={t("apartmentPlaceholder")} value={addr.line2 ?? ""} onChange={(v) => set({ ...addr, line2: v })} className="sm:col-span-2" />
      <Field id={`${prefix}-city`} label={t("city")} value={addr.city} onChange={(v) => set({ ...addr, city: v })} required />
      <Field id={`${prefix}-postcode`} label={t("postcode")} value={addr.postcode} onChange={(v) => set({ ...addr, postcode: v })} required />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${prefix}-country`} className="text-xs font-semibold uppercase tracking-wide text-[#7c9073]">{t("country")}</Label>
        <select id={`${prefix}-country`} className="h-[46px] w-full rounded-[10px] border border-[#d5cbb9] bg-white px-3.5 text-sm text-[#173b2e] focus:outline-2 focus:outline-[#2d5b40]" value={addr.country} onChange={(e) => set({ ...addr, country: e.target.value })}>
          {(prefix === "bill" ? BILLING_COUNTRIES : SHIPPING_COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {prefix === "ship" && UK_ONLY_SHIPPING && <p className="text-xs text-muted-foreground sm:col-span-2">Royal Mail Tracked 24 delivery within Great Britain. Northern Ireland and Channel Islands are not yet supported.</p>}
      {prefix === "ship" && <Field id="phone" label={t("phone")} value={addr.phone ?? ""} onChange={(v) => set({ ...addr, phone: v })} type="tel" className="sm:col-span-2" />}
    </div>
  );

  return (
    <div data-checkout className="bg-[#f5f1e9] text-[#173b2e] [--primary:#2d5b40] [--muted-foreground:#7c9073] [--border:#e6dece]">
      <h1 className="sr-only">{t("title")}</h1>
      <form onSubmit={onSubmit} className="mx-auto grid max-w-[1144px] items-start gap-4 px-5 py-8 lg:min-h-[770px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:py-10">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1" aria-label={t("orderSummary")}>
          <button type="button" className="flex w-full items-center justify-between rounded-[14px] border border-[#e6dece] bg-white px-4 py-4 text-sm font-semibold lg:hidden" aria-expanded={showSummary} aria-controls="checkout-summary" onClick={() => setShowSummary(!showSummary)}>
            <span className="flex items-center gap-2"><ShoppingCart aria-hidden="true" className="size-4" />{t(showSummary ? "hideSummary" : "showSummary")}<ChevronDown aria-hidden="true" className={`size-4 transition-transform ${showSummary ? "rotate-180" : ""}`} /></span>
            <span>{formattedTotal}</span>
          </button>
          <div id="checkout-summary" className={`${showSummary ? "block" : "hidden"} mt-3 rounded-[15px] border border-[#e6dece] bg-white p-6 lg:mt-0 lg:block`}>
            <h2 className="font-serif text-xl">{t("orderSummary")}</h2>
            <ul className="mt-5 space-y-4">
              {items.map((i) => (
                <li key={i.variantId} className="flex items-center gap-3 text-xs">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-[#eeebe2]">
                    <Image src={i.image} alt={i.name} fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1"><p>{i.name}</p><p className="mt-0.5 text-[#7c9073]">{i.variantLabel}</p><p className="text-[#7c9073]">x{i.qty}</p></div>
                  <span className="shrink-0 font-medium">{avionCheckout ? formatOrderMoney(Math.round(i.unitCents * rate) * i.qty, chargedCurrency) : fmt(i.unitCents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-5" />
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Tag aria-hidden="true" className="absolute left-3 top-3.5 size-3.5 text-[#7c9073]" />
                <Input aria-label={tc("coupon")} placeholder={tc("coupon")} className="h-[42px] rounded-[10px] border-[#d5cbb9] bg-white pl-9 text-xs placeholder:text-[#9eaf97]" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }} />
              </div>
              <Button type="button" className="h-[42px] rounded-[10px] bg-[#2d5b40] px-4 text-white hover:bg-[#234832]" onClick={applyCode}>{tc("apply")}</Button>
            </div>
            {couponError && <p role="alert" className="mt-2 text-xs text-destructive">{couponError}</p>}
            <dl className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between"><dt>{tc("subtotal")} ({tc("itemCount", { count: items.reduce((count, i) => count + i.qty, 0) })})</dt><dd>{formattedSubtotal}</dd></div>
              {discount > 0 && <div className="flex justify-between"><dt>{tc("discount")} ({couponCode})</dt><dd>−{fmt(discount)}</dd></div>}
              <div className="flex justify-between"><dt>{tc("shipping")}</dt><dd>{shipping === 0 ? tc("free") : fmt(shipping)}</dd></div>
              <div className="flex justify-between text-[#7c9073]"><dt>{t("tax")}</dt><dd>{fmt(0)}</dd></div>
              <Separator className="my-5" />
              <div className="flex justify-between font-serif text-xl"><dt>{tc("total")}</dt><dd className="font-semibold">{formattedTotal}</dd></div>
            </dl>
            {currency !== "EUR" && <p className="mt-2 text-[11px] text-[#7c9073]">{avionCheckout ? "Charged in" : "Approximate display conversion · Charged in"} {chargedCurrency} ({avionCheckout ? fmt(total) : formatMoney(total, "EUR")})</p>}
            <Button type="submit" className={`${buttonClass} mt-6 text-sm`} disabled={step !== 3 || !agree || submitting}>{submitting ? t("paying") : t(paymentMethod === "bank_transfer" ? "bankPlaceOrder" : avionCheckout ? "avionPlaceOrder" : "completePayment")}</Button>
            {(step !== 3 || !agree) && <p className="mt-2 text-center text-xs text-[#b98a52]">{t("completeRequired")}</p>}
            <div className="mt-5 space-y-3 border-t border-[#e6dece] pt-4 text-xs">
              <p className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eaf0eb]"><ShieldCheck aria-hidden="true" className="size-4 text-[#2d5b40]" /></span>{t("secureCheckout")}</p>
              <p className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eaf0eb]"><Package aria-hidden="true" className="size-4 text-[#2d5b40]" /></span>{t("dispatchBefore")}</p>
            </div>
            {!guestBankCheckout && <div className="mt-5"><PaymentLogos /></div>}
          </div>
        </aside>

        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <CheckoutStep number={1} step={step} title={t("yourDetails")} summary={`${email} · ${ship.firstName} ${ship.lastName}`} editLabel={t("edit")} onEdit={() => setStep(1)} onNext={nextStep}>
            {!BROWSE_ONLY && !guestBankCheckout && <div className="space-y-3 text-sm"><Link href="/account" className="underline">{r("accountLink")}</Link><label className="block">{r("paymentCurrency")}<select value={paymentCurrency} onChange={e => setPaymentCurrency(e.target.value)} className="ml-3 rounded border bg-white p-2">{paymentCurrencies.map(c => <option key={c}>{c}</option>)}</select></label><p className="text-xs text-[#7c9073]">{r("currencyNotice")}</p></div>}
            <Field id="email" label={t("email")} placeholder="your@email.com" type="email" value={email} onChange={setEmail} required />
            <p className="text-xs leading-5 text-[#7c9073]">{t("emailHint")} <Link href="/account" className="text-[#173b2e] underline">{t("logIn")}</Link></p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ship-first" label={t("firstName")} value={ship.firstName} onChange={(v) => setShip({ ...ship, firstName: v })} required />
              <Field id="ship-last" label={t("lastName")} value={ship.lastName} onChange={(v) => setShip({ ...ship, lastName: v })} required />
            </div>
            <Button type="button" className={buttonClass} disabled={!detailsComplete} onClick={(e) => nextStep(e.currentTarget.closest("fieldset")!)}>{t("continueShipping")}<ArrowRight aria-hidden="true" className="size-4" /></Button>
          </CheckoutStep>

          <CheckoutStep number={2} step={step} title={t("shippingAddress")} summary={`${ship.line1}, ${ship.postcode}, ${ship.city}, ${countryName}`} editLabel={t("edit")} onEdit={() => setStep(2)} onNext={nextStep}>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7c9073]">{t("deliveryQuestion")}</p>
              <div className="rounded-[10px] border border-[#2d5b40] bg-[#eceee5] px-4 py-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Home aria-hidden="true" className="size-4" />{t("homeDelivery")}</p><p className="mt-1 text-xs text-[#7c9073]">{t("toYourAddress")}</p></div>
            </div>
            {addressFields(ship, setShip, "ship")}
            <div className="flex gap-3 rounded-[10px] border border-[#dde3d5] bg-[#edf0e7] p-4 text-[#7c9073]"><Truck aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-medium">{t("fastDelivery")}</p><p className="mt-1 text-xs leading-5">{t("deliveryHint")}</p></div></div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#7c9073]">{t("shippingMethod")}</h3>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as "standard" | "express")} className="gap-2">
                {zone.methods.map((m) => {
                  const price = shippingCost(ship.country, m.id, subtotal - discount);
                  return <label key={m.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-[#d5cbb9] bg-white px-4 py-3 has-[[data-checked]]:border-[#2d5b40]">
                    <span className="flex items-center gap-3"><RadioGroupItem value={m.id} id={`m-${m.id}`} /><span><span className="text-sm font-medium">{t(m.id)}</span><span className="mt-1 block text-xs text-[#7c9073]">{t("eta", { min: m.etaDays[0], max: m.etaDays[1] })} · {m.carriers.join(", ")}</span></span></span><span className="shrink-0 text-sm font-medium">{price === 0 ? tc("free") : fmt(price)}</span>
                  </label>;
                })}
              </RadioGroup>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={billingSame} onCheckedChange={(v) => setBillingSame(Boolean(v))} />{t("billingSame")}</label>
            {!billingSame && <div className="space-y-4"><h3 className="font-serif text-lg">{t("billingAddress")}</h3>{addressFields(bill, setBill, "bill")}</div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="button" className={buttonClass} disabled={!shippingComplete} onClick={(e) => nextStep(e.currentTarget.closest("fieldset")!)}>{t("continueToPayment")}<ArrowRight aria-hidden="true" className="size-4" /></Button>
          </CheckoutStep>

          <CheckoutStep number={3} step={step} title={t("paymentMethod")} editLabel={t("edit")} onEdit={() => setStep(3)} onNext={nextStep}>
            <RadioGroup aria-label={t("paymentMethod")} value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "card" | "bank_transfer")}>
              {!guestBankCheckout && <label className="flex items-center gap-3 rounded-xl border bg-white p-4 text-sm"><RadioGroupItem value="card" />{t(avionCheckout ? "avionPaymentLink" : "creditDebitCard")}</label>}
              <label className="flex items-center gap-3 rounded-xl border bg-white p-4 text-sm"><RadioGroupItem value="bank_transfer" disabled={!(BROWSE_ONLY && DEMO_CHECKOUT) && bankCurrency !== chargedCurrency} />{t("bankTransfer")}</label>
            </RadioGroup>
            {paymentMethod === "bank_transfer" ? <div className="rounded-xl border bg-white p-4 text-sm"><p>{t("bankTransferBody")}</p>{BROWSE_ONLY && <p className="mt-2 text-xs text-muted-foreground">{t("bankTransferPreview")}</p>}</div> : <>
            <div className="rounded-[14px] border-2 border-[#2d5b40] bg-[#f5f1e9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold"><CreditCard aria-hidden="true" className="size-5 text-[#2d5b40]" />{t(avionCheckout ? "avionPaymentLink" : "creditDebitCard")}</span><PaymentLogos methods={avionCheckout ? ["Visa", "Mastercard", "PayPal", "Apple Pay", "Klarna"] : ["Visa", "Mastercard"]} /></div>
              {!avionCheckout && <p className="mt-2 text-xs text-[#7c9073]">Visa, Mastercard</p>}
              <div className="mt-5 flex gap-2 rounded-[12px] border border-[#e6dece] bg-white p-4 text-sm"><Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#2d5b40]" /><p className="text-xs font-medium leading-5">{t(avionCheckout ? "avionPaymentBody" : "paymentRedirect")}</p></div>
            </div>
            </>}
            {!(BROWSE_ONLY && DEMO_CHECKOUT) && bankCurrency !== chargedCurrency && <p className="text-xs text-muted-foreground">{t("bankTransferUnavailable")}</p>}
            <label className="flex items-start gap-2 text-xs leading-5 text-[#7c9073]"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} required className="mt-0.5" /><span>{t("agreeTerms")} (<Link href="/legal/terms" className="text-[#173b2e] underline" target="_blank">Terms</Link>, <Link href="/legal/privacy" className="text-[#173b2e] underline" target="_blank">Privacy</Link>)</span></label>
            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className={`${buttonClass} h-14 font-serif text-lg`} disabled={!agree || submitting} data-testid="continue-to-payment">{submitting ? t("paying") : `${t(paymentMethod === "bank_transfer" ? "bankPlaceOrder" : avionCheckout ? "avionPlaceOrder" : "continueToPayment")} · ${formattedTotal}`}</Button>
            <Link href="/contact" className="block text-center text-xs text-[#7c9073] underline">{t("needHelp")}</Link>
            <CheckoutTrust />
          </CheckoutStep>
        </div>
      </form>
    </div>
  );
}

function CheckoutStep({ number, step, title, summary, editLabel, onEdit, onNext, children }: {
  number: number; step: number; title: string; summary?: string; editLabel: string;
  onEdit: () => void; onNext: (section: HTMLFieldSetElement) => void; children: ReactNode;
}) {
  const active = step === number;
  const complete = step > number;
  return (
    <section className={`rounded-[14px] border-2 p-5 ${active ? "border-[#2d5b40] bg-[#ece9df]" : complete ? "border-[#8fa28b] bg-[#ece9df]" : "border-[#eee8dc] bg-[#faf7f1]"}`}>
      <div className={`flex items-center gap-3 ${active || complete ? "text-[#173b2e]" : "text-[#99a697]"}`}>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${active || complete ? "bg-[#2d5b40] text-white" : "bg-[#eeebe1] text-[#c8cdbf]"}`}>{complete ? <Check aria-hidden="true" className="size-4" /> : number}</span>
        <h2 className="font-serif text-xl">{title}</h2>
        {complete && <button type="button" onClick={onEdit} className="ml-auto text-xs underline-offset-4 hover:underline">{editLabel}</button>}
      </div>
      {complete && summary && <p className="mt-3 break-words pl-11 text-xs leading-5">{summary}</p>}
      <fieldset hidden={!active} className="mt-5 min-w-0 space-y-4" onKeyDown={(e) => { if (e.key === "Enter" && number < 3 && e.target instanceof HTMLInputElement) { e.preventDefault(); onNext(e.currentTarget); } }}>
        <legend className="sr-only">{title}</legend>
        {children}
      </fieldset>
    </section>
  );
}

function Field({
  id, label, value, onChange, type = "text", required, className, placeholder,
}: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string; placeholder?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-[#7c9073]">{label}</Label>
      <Input id={id} name={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="h-[46px] rounded-[10px] border-[#d5cbb9] bg-white px-3.5 text-sm text-[#173b2e] placeholder:text-[#9eaf97]" autoComplete={id} />
    </div>
  );
}
