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
  const [qty, setQty] = useState(2);
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
  return <div className="reta-sales">
    <div className="rs-banner"><span>THE PEPTBAY RESEARCH COLLECTION</span><strong>RETATRUTIDE PEN</strong><span>One-time order · GBP bank transfer</span></div>
    <section className="rs-hero">
      <div className="rs-wrap rs-hero-inner">
        <div><Link href="/" aria-label="Peptbay home" className="rs-logo"><Image src="/v2/peptbay-logo-dark.svg" alt="Peptbay" width={130} height={35} priority /></Link><h1>RETATRUTIDE<br /><strong>PEN {variant.label.split(" / ")[0].toUpperCase()}</strong></h1><p>Choose your presentation and quantity for laboratory research.</p></div>
        <div className="rs-hero-photo">{variant.images[0] && <Image src={variant.images[0]} alt={`Retatrutide Pen packaging, ${variant.label}`} width={420} height={280} priority sizes="(max-width: 900px) 80vw, 300px" />}</div>
      </div>
    </section>
    <div className="rs-wrap rs-columns">
      <div className="rs-selection">
        <div className="rs-panel">
          <div className="rs-benefits">{[{ Icon: FlaskConical, label: "Research use" }, { Icon: PackageCheck, label: "One-time order" }, { Icon: Truck, label: "UK delivery" }, { Icon: Landmark, label: "Bank transfer" }].map(({ Icon, label }) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span></div>)}</div>
          <div className="rs-intro"><span className="rs-round"><Check aria-hidden="true" /></span><div><h2>Your RETA order, in one place</h2><p>Select your pack below, then enter your delivery details. Bank instructions follow after placing your order.</p></div></div>
        </div>
        <div className="rs-panel">
          <h2 className="rs-step">Step 1: Select your order</h2>
          <fieldset className="rs-strengths"><legend>Presentation</legend>{variants.map(v => <label key={v.id}><input type="radio" name="reta-strength" checked={v.id === variant.id} onChange={() => setVariantId(v.id)} /><span>{v.label}</span></label>)}</fieldset>
          <fieldset><legend className="sr-only">Order quantity</legend><div className="rs-packs">{[2, 3, 1].map(n => <label key={n} className={`rs-pack ${qty === n ? "rs-selected" : ""}`}>
            <input type="radio" name="reta-quantity" checked={qty === n} onChange={() => setQty(n)} aria-label={`${n} ${n === 1 ? "pen" : "pens"}`} />
            <div className="rs-pack-body"><div className="rs-pack-photo">{variant.images[0] && <Image src={variant.images[0]} alt="" width={240} height={180} sizes="(max-width: 900px) 40vw, 150px" />}<span>{n}×</span></div><div className="rs-pack-copy"><h3><strong>{n}×</strong> Retatrutide Pen</h3><p>{variant.label}</p><strong className="rs-price">{money(unit)}</strong><span>per pen</span></div></div>
            <div className="rs-pack-total">Total: <strong>{money(unit * n)}</strong></div>
          </label>)}</div></fieldset>
          <div className="rs-delivery"><Truck aria-hidden="true" /><div><strong>UK delivery</strong><p>Shipping options and final charges shown at checkout.</p></div></div>
          <div className="rs-once"><h3><Check aria-hidden="true" /> This is a one-time purchase</h3><p>No subscription or recurring billing. Dispatch is arranged after our team confirms payment.</p></div>
          <button type="button" disabled={!available} onClick={reviewOrder} className="rs-continue">Continue to delivery <ArrowRight aria-hidden="true" /></button>
          {!available && <p role="status">{checkoutEnabled ? "This quantity is currently unavailable." : "Checkout is not currently available. Please contact Peptbay."}</p>}
          {otherItems && <p className="rs-note">Your other cart items will be kept and shown in the checkout summary.</p>}
        </div>
      </div>
      <div ref={checkout} id="reta-checkout" tabIndex={-1} className="rs-checkout">
        <h2 className="rs-step">Step 2: Complete your order</h2>
        {checkoutEnabled ? <CheckoutForm paymentCurrencies={["GBP"]} paymentRates={{ GBP: rate }} avionCheckout bankCurrency="GBP" guestBankCheckout orderItems={orderItems} embedded /> : <p className="rs-panel">Checkout is not currently available. Please contact Peptbay.</p>}
      </div>
    </div>
    <section className="rs-wrap rs-research"><FlaskConical aria-hidden="true" /><p><strong>Intended for laboratory research.</strong> Not for human or veterinary use, clinical administration, or therapeutic use. Presentation sizes describe the product contents, not dosing instructions.</p></section>
    <section className="rs-wrap rs-faq"><h2>Before you order</h2>{[
      ["How do I pay for my order?", "Your confirmation provides the GBP bank-transfer details, payment reference and deadline. Payment is confirmed manually before dispatch."],
      ["Is this a subscription?", "No. This is a one-time product order. There are no recurring subscription payments."],
      ["Where can my order be delivered?", "This checkout currently supports UK delivery. Enter your address to review shipping and the final order total."],
    ].map(([q,a]) => <details key={q}><summary>{q}<ChevronDown aria-hidden="true" /></summary><p>{a}</p></details>)}<p className="rs-note">Read our <Link href="/legal/privacy">Privacy Policy</Link> before ordering.</p></section>
  </div>;
}
