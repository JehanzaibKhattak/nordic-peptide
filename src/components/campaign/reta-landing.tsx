"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, FlaskConical, Landmark, FileText, ShieldCheck, Headphones, LockKeyhole, Truck } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { useCart } from "@/lib/cart-store";
import { retaPackOffer, retaPackDiscount } from "@/lib/reta-offer";
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
  const offer = retaPackOffer(variant.sku, qty, "GBP");
  const packTotal = (n: number) => unit * n - retaPackDiscount(variant.sku, n, "GBP", unit);
  const offerVariantId = variants.find(v => v.sku === "RET20")?.id;
  const available = checkoutEnabled && (offlineInventoryEnabled() || variant.stock >= qty);
  const otherItems = items.some(item => item.productId !== product.id);
  const money = (amount: number) => formatOrderMoney(amount, "GBP");

  function reviewOrder() {
    if (!available) return;
    pushEvent("begin_checkout", { campaign: "reta", ecommerce: { currency: "GBP", value: packTotal(qty) / 100, items: [{ item_id: variant.sku, item_name: "Retatrutide Pen", item_variant: variant.label, price: packTotal(qty) / qty / 100, quantity: qty }] } });
    requestAnimationFrame(() => { checkout.current?.scrollIntoView({ behavior: "smooth", block: "start" }); checkout.current?.focus({ preventScroll: true }); });
  }

  const orderItems = campaignCart(items, { productId: product.id, variantId: variant.id, slug: product.slug, name: "Retatrutide Pen", variantLabel: variant.label, image: variant.images[0] ?? "", unitCents: variant.priceCents, qty });
  return <div className="reta-sales">
    <div className="rs-banner"><span>{offer ? "RETA PACK OFFER" : "THE PEPTBAY RESEARCH COLLECTION"}</span><strong>{offer ? "20% OFF RETATRUTIDE PEN 20 MG" : "RETATRUTIDE PEN 40 MG"}</strong><span>{offer ? "Save 25% with 2 pens · Save 30% with 3 pens" : "One-time order · GBP bank transfer"}</span></div>
    <section className="rs-hero">
      <div className="rs-wrap rs-hero-inner">
        <div><Link href="/" aria-label="Peptbay home" className="rs-logo"><Image src="/v2/peptbay-logo-dark.svg" alt="Peptbay" width={130} height={35} priority /></Link><h1>RETATRUTIDE<br /><strong>PEN {variant.label.split(" / ")[0].toUpperCase()}</strong></h1><p>Choose your presentation and quantity for laboratory research.</p></div>
        <div className="rs-hero-photo">{variant.images[0] && <Image src={variant.images[0]} alt={`Retatrutide Pen packaging, ${variant.label}`} width={420} height={280} priority sizes="(max-width: 900px) 80vw, 300px" />}</div>
      </div>
    </section>
    <div className="rs-wrap rs-columns">
      <div className="rs-selection">
        <div className="rs-panel">
          <div className="rs-benefits">{[{ Icon: FlaskConical, label: "99%+ Purity" }, { Icon: ShieldCheck, label: "Third-party Tested" }, { Icon: FileText, label: "COA Included" }, { Icon: Truck, label: "Dispatch after payment" }].map(({ Icon, label }) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span></div>)}</div>
          {offer ? <div className="rs-intro"><span className="rs-round rs-offer-round"><strong>{offer.percent}%</strong><span>OFF</span></span><div><h2>Your {offer.percent}% pack discount is applied</h2><p>Retatrutide Pen 20 mg from <s>{money(unit)}</s> <strong className="rs-offer-price">{money(packTotal(qty) / qty)}</strong> per pen with your selected {qty}-pen pack.</p></div></div> : <div className="rs-intro"><span className="rs-round"><Check aria-hidden="true" /></span><div><h2>Your RETA order, in one place</h2><p>Select your pack below, then enter your delivery details. Bank instructions follow after placing your order.</p></div></div>}
        </div>
        <div className="rs-panel">
          <h2 className="rs-step">Step 1: Select your order</h2>
          <fieldset className="rs-strengths"><legend>Presentation</legend>{variants.map(v => <label key={v.id}><input type="radio" name="reta-strength" checked={v.id === variant.id} onChange={() => setVariantId(v.id)} /><span>{v.label}</span></label>)}</fieldset>
          <fieldset><legend className="sr-only">Order quantity</legend><div className="rs-packs">{[2, 3, 1].map(n => <label key={n} className={`rs-pack ${qty === n ? "rs-selected" : ""}`}>
            {offer && n === 3 && <span className="rs-pack-ribbon">BEST VALUE</span>}
            <input type="radio" name="reta-quantity" checked={qty === n} onChange={() => setQty(n)} aria-label={`${n} ${n === 1 ? "pen" : "pens"}`} />
            <div className="rs-pack-body"><div className="rs-pack-photo">{variant.images[0] && <Image src={variant.images[0]} alt="" width={240} height={180} sizes="(max-width: 900px) 40vw, 150px" />}<span>{n}×</span></div><div className="rs-pack-copy"><h3><strong>{n}×</strong> Retatrutide Pen</h3><p>{variant.label}</p>{offer && <span className="rs-discount-tag">{retaPackOffer(variant.sku, n, "GBP")!.percent}% OFF</span>}<strong className="rs-price">{money(packTotal(n) / n)}</strong><span>per pen</span></div></div>
            <div className="rs-pack-total">Total: <strong>{money(packTotal(n))}</strong> {offer && <s>{money(unit * n)}</s>}</div>
          </label>)}</div></fieldset>
          <div className="rs-courier"><p>SHIPPED BY</p><div><span className="rs-royal-mail">Royal Mail</span><strong>Tracked 24</strong></div><p>Shipping options and final charges shown at checkout.</p></div>
          <div className="rs-reassurance"><div><Truck aria-hidden="true" /><span>UK tracked delivery</span></div><div><Headphones aria-hidden="true" /><span>Customer support</span></div><div><Landmark aria-hidden="true" /><span>GBP bank transfer</span></div></div>
          <div className="rs-once"><h3><Check aria-hidden="true" /> This is a one-time purchase</h3><p>No subscription or recurring billing. Dispatch is arranged after our team confirms payment.</p></div>
          <button type="button" disabled={!available} onClick={reviewOrder} className="rs-continue">Continue to delivery <ArrowRight aria-hidden="true" /></button>
          {!available && <p role="status">{checkoutEnabled ? "This quantity is currently unavailable." : "Checkout is not currently available. Please contact Peptbay."}</p>}
          {otherItems && <p className="rs-note">Your other cart items will be kept and shown in the checkout summary.</p>}
        </div>
      </div>
      <div ref={checkout} id="reta-checkout" tabIndex={-1} className="rs-checkout">
        <h2 className="rs-step">Step 2: Complete your order</h2>
        {checkoutEnabled ? <CheckoutForm paymentCurrencies={["GBP"]} paymentRates={{ GBP: rate }} avionCheckout bankCurrency="GBP" guestBankCheckout orderItems={orderItems} retaOfferVariantId={offerVariantId} embedded /> : <p className="rs-panel">Checkout is not currently available. Please contact Peptbay.</p>}
        <div className="rs-panel rs-payment-trust"><div className="rs-reassurance"><div><LockKeyhole aria-hidden="true" /><span>HTTPS encrypted connection</span></div><div><Landmark aria-hidden="true" /><span>Pay in your banking app</span></div><div><ShieldCheck aria-hidden="true" /><span>No card details collected</span></div></div><h3><LockKeyhole aria-hidden="true" /> Secure bank-transfer checkout</h3><p>Use the account details and payment reference on your order confirmation. Our team confirms receipt before dispatch.</p><Link href="/testing">View batch documentation <ArrowRight aria-hidden="true" /></Link></div>
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
