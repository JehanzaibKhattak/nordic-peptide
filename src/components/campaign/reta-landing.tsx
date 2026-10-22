"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, FlaskConical, Landmark, PackageCheck, Truck } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { useCart } from "@/lib/cart-store";
import { campaignCart } from "@/lib/campaign-cart";
import { offlineInventoryEnabled } from "@/lib/inventory";
import { formatOrderMoney } from "@/lib/money";
import { pushEvent } from "@/components/layout/gtm";
import { Link } from "@/i18n/routing";

type Variant = { id: string; sku: string; label: string; priceCents: number; stock: number; images: string[] };
export function RetaLanding({ product, variants, rate, checkoutEnabled }: { product: { id: string; slug: string }; variants: Variant[]; rate: number; checkoutEnabled: boolean }) {
  const [variantId, setVariantId] = useState(variants[0].id);
  const [qty, setQty] = useState(1);
  const checkout = useRef<HTMLDivElement>(null);
  const items = useCart(s => s.items);
  const variant = variants.find(v => v.id === variantId) ?? variants[0];
  const unit = Math.round(variant.priceCents * rate);
  const available = checkoutEnabled && (offlineInventoryEnabled() || variant.stock >= qty);
  const otherItems = items.some(item => item.productId !== product.id);
  const money = (amount: number) => formatOrderMoney(amount, "GBP");

  function reviewOrder() {
    if (!available) return;
    pushEvent("begin_checkout", { campaign: "reta", ecommerce: { currency: "GBP", value: unit * qty / 100, items: [{ item_id: variant.sku, item_name: "Retatrutide Pen", item_variant: variant.label, price: unit / 100, quantity: qty }] } });
    requestAnimationFrame(() => { checkout.current?.scrollIntoView({ behavior: "smooth", block: "start" }); checkout.current?.focus({ preventScroll: true }); });
  }

  const orderItems = campaignCart(items, { productId: product.id, variantId: variant.id, slug: product.slug, name: "Retatrutide Pen", variantLabel: variant.label, image: variant.images[0] ?? "", unitCents: variant.priceCents, qty });
  return <div className="bg-[#f7f5ef] text-[#193c30]">
    <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 md:pt-14">
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-[#72816d]">THE PEPTBAY RESEARCH COLLECTION</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl">Your research.<br /><span className="italic text-[#7b8c73]">A focused start.</span></h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#5e7065]">RETA · Retatrutide Pen. Choose the presentation and quantity for your laboratory, then complete your order below.</p>
          <div className="relative mt-7 aspect-[5/2] overflow-hidden rounded-[28px] border border-[#e5e3d9] bg-[#eeeee5]">
            {variant.images[0] && <Image key={variant.id} src={variant.images[0]} alt={`Retatrutide Pen packaging, ${variant.label}`} fill priority sizes="(max-width: 1024px) 100vw, 500px" className="object-contain p-8 mix-blend-multiply" />}
            <span className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-medium">{variant.label} · Research use</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs leading-5 text-[#637769]">
            <span className="flex flex-col items-center gap-2"><PackageCheck className="size-5" aria-hidden="true" />One-time order</span>
            <span className="flex flex-col items-center gap-2"><Truck className="size-5" aria-hidden="true" />UK delivery</span>
            <span className="flex flex-col items-center gap-2"><Landmark className="size-5" aria-hidden="true" />Bank transfer</span>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#dddccf] bg-white p-5 shadow-[0_12px_45px_-30px_#193c3050] md:p-8">
          <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#193c30] text-sm text-white">1</span><h2 className="font-serif text-2xl">Build your RETA order</h2></div>
          <fieldset className="mt-7"><legend className="mb-3 text-sm font-semibold">Choose your presentation</legend>
            <div className="grid gap-3 sm:grid-cols-2">{variants.map(v => <label key={v.id} className={`relative cursor-pointer rounded-xl border-2 p-4 transition-colors ${variant.id === v.id ? "border-[#2e5a43] bg-[#f1f5ed]" : "border-[#e6e7df] bg-white hover:border-[#97aa91]"}`}>
              <input type="radio" name="reta-strength" value={v.id} checked={variant.id === v.id} onChange={() => setVariantId(v.id)} className="peer sr-only" />
              <span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#193c30]" />
              <span className="flex justify-between gap-2"><span className="text-sm font-semibold">{v.label}</span><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${variant.id === v.id ? "border-[#2e5a43] bg-[#2e5a43] text-white" : "border-[#b8c3b5]"}`}>{variant.id === v.id && <Check className="size-3" aria-hidden="true" />}</span></span>
              <span className="mt-4 block text-2xl font-semibold">{money(Math.round(v.priceCents * rate))}</span><span className="text-xs text-[#72816d]">per pen</span>
            </label>)}</div>
          </fieldset>
          <fieldset className="mt-6"><legend className="mb-3 text-sm font-semibold">Choose quantity</legend><div className="grid grid-cols-3 gap-3">{[1, 2, 3].map(n => <label key={n} className={`cursor-pointer rounded-xl border-2 p-3 text-center ${qty === n ? "border-[#2e5a43] bg-[#f1f5ed]" : "border-[#e6e7df]"}`}><input type="radio" name="reta-quantity" checked={qty === n} onChange={() => setQty(n)} className="mb-2 size-4 accent-[#2e5a43]" /><span className="block text-sm font-semibold">{n} {n === 1 ? "pen" : "pens"}</span><span className="mt-1 block text-xs text-[#637769]">{money(unit * n)}</span></label>)}</div></fieldset>
          <div className="mt-6 space-y-3 rounded-xl bg-[#f7f7f1] p-5 text-sm"><div className="flex justify-between gap-4"><span>{qty} × {variant.label}</span><span>{money(unit * qty)}</span></div><div className="flex justify-between"><span>UK standard shipping</span><span>Calculated at checkout</span></div><div className="flex justify-between border-t border-[#dce1d5] pt-3"><span className="font-semibold">Product total</span><strong className="font-serif text-2xl" aria-live="polite">{money(unit * qty)}</strong></div></div>
          <button type="button" disabled={!available} onClick={reviewOrder} className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#2e5a43] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#193c30] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">Continue to delivery<ArrowRight className="size-5" aria-hidden="true" /></button>
          {!available && <p role="status" className="mt-3 text-sm">{checkoutEnabled ? "This quantity is currently unavailable." : "Checkout is not currently available. Please contact Peptbay."}</p>}
          {otherItems && <p className="mt-3 text-xs leading-5 text-[#637769]">Your other cart items will be kept and shown in the checkout summary.</p>}
          <p className="mt-4 text-center text-xs leading-5 text-[#637769]">One-time purchase. No subscription.<br />Pay by GBP bank transfer after placing your order.</p>
        </div>
        </div>
        <div ref={checkout} id="reta-checkout" tabIndex={-1} className="scroll-mt-8 outline-none">
          <h2 className="mb-4 font-serif text-2xl">Complete your order</h2>
          {checkoutEnabled ? <CheckoutForm paymentCurrencies={["GBP"]} paymentRates={{ GBP: rate }} avionCheckout bankCurrency="GBP" guestBankCheckout orderItems={orderItems} embedded /> : <p className="rounded-xl border bg-white p-6">Checkout is not currently available. Please contact Peptbay.</p>}
        </div>
      </div>
    </section>
    <section className="border-y border-[#e0e3d8] bg-[#edf1e7] px-5 py-6"><div className="mx-auto flex max-w-6xl items-start gap-4 text-sm leading-6"><FlaskConical className="mt-1 size-6 shrink-0" aria-hidden="true" /><p><strong>Intended for laboratory research.</strong> Not for human or veterinary use, clinical administration, or therapeutic use. Presentation sizes describe the product contents, not dosing instructions.</p></div></section>
    <section className="mx-auto max-w-3xl px-5 py-12 md:py-16"><p className="text-center text-xs font-semibold tracking-[0.2em] text-[#72816d]">BEFORE YOU ORDER</p><h2 className="mt-3 text-center font-serif text-3xl">A little clarity goes a long way.</h2><div className="mt-7 divide-y divide-[#dce1d5]">{[
      ["How do I pay for my order?", "Place your order using the checkout on this page. Your confirmation provides the GBP bank-transfer details, payment reference and deadline. Payment is confirmed manually before dispatch."],
      ["Is this a subscription?", "No. This is a one-time product order. There are no recurring subscription payments."],
      ["Where can my order be delivered?", "This checkout currently supports UK delivery. Enter your address to review the shipping charge and final order total before you place your order."],
      ["When will my order be dispatched?", "The team arranges fulfilment after confirming receipt of payment. Placing an order does not confirm that a bank transfer has been received."],
    ].map(([q,a]) => <details key={q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-3 text-sm leading-7 text-[#637769]">{a}</p></details>)}</div><p className="mt-6 text-center text-sm text-[#637769]">Read our <Link href="/legal/privacy" className="underline underline-offset-4">Privacy Policy</Link> before ordering.</p></section>
  </div>;
}
