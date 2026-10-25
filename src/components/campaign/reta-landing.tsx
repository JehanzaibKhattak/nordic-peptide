"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, Landmark, ShieldCheck, LockKeyhole } from "lucide-react";
import { CertificationReports } from "@/components/store/certification-reports";
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
  const photo = variant.sku === "RET20" ? "/sales/retatrutide-20mg.jpg" : variant.images[0];
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
        <div><Link href="/" aria-label="Peptbay home" className="rs-logo"><Image src="/sales/peptbay-logo-dark.svg" alt="Peptbay" width={114} height={30} priority style={{ width: "auto", height: 30 }} /></Link><h1>RETATRUTIDE<br /><strong>PEN {variant.label.split(" / ")[0].toUpperCase()}</strong></h1><p>Research-grade · Third-party tested · COA included</p></div>
        <div className="rs-hero-photo">{photo && <Image src={photo} alt={`Retatrutide Pen packaging, ${variant.label}`} width={420} height={280} priority sizes="(max-width: 900px) 80vw, 300px" />}</div>
      </div>
    </section>
    <div className="rs-wrap rs-columns">
      <div className="rs-selection">
        <div className="rs-panel">
          <div className="rs-benefits">{[<>99%+<br />Purity</>, <>Third-party<br />Tested</>, <>COA<br />Included</>, <>Same-day<br />Dispatch</>].map((label, i) => <div key={i}><Image src={`/sales/benefit-${i}.svg`} alt="" width={40} height={40} /><span>{label}</span></div>)}</div>
          {offer ? <div className="rs-intro"><span className="rs-round rs-offer-round"><strong>{offer.percent}%</strong><span>OFF</span></span><div><h2>Your {offer.percent}% pack discount is applied</h2><p>Retatrutide Pen 20 mg from <s>{money(unit)}</s> <strong className="rs-offer-price">{money(packTotal(qty) / qty)}</strong> per pen with your selected {qty}-pen pack.</p></div></div> : <div className="rs-intro"><span className="rs-round"><Check aria-hidden="true" /></span><div><h2>Your RETA order, in one place</h2><p>Select your pack below, then enter your delivery details. Bank instructions follow after placing your order.</p></div></div>}
        </div>
        <div className="rs-panel">
          <h2 className="rs-step"><Image src="/sales/step-0.svg" alt="" width={18} height={20} />Step 1: Select Order quantity</h2>
          <fieldset className="rs-strengths"><legend>Presentation</legend>{variants.map(v => <label key={v.id}><input type="radio" name="reta-strength" checked={v.id === variant.id} onChange={() => setVariantId(v.id)} /><span>{v.label}</span></label>)}</fieldset>
          <fieldset><legend className="sr-only">Order quantity</legend><div className="rs-packs">{[2, 3, 1].map(n => <label key={n} className={`rs-pack ${qty === n ? "rs-selected" : ""}`}>
            {offer && n === 3 && <span className="rs-pack-ribbon">BEST VALUE</span>}
            <input type="radio" name="reta-quantity" checked={qty === n} onChange={() => setQty(n)} aria-label={`${n} ${n === 1 ? "pen" : "pens"}`} />
            <div className="rs-pack-body"><div className="rs-pack-photo">{photo && <Image src={photo} alt="" width={240} height={180} sizes="(max-width: 900px) 40vw, 150px" />}<span>{n}×</span></div><div className="rs-pack-copy"><h3><strong>{n}x</strong> Retatrutide Pen<br />({variant.label})</h3>{offer && <span className="rs-discount-tag">{retaPackOffer(variant.sku, n, "GBP")!.percent}% OFF</span>}<strong className="rs-price">{money(packTotal(n) / n)}</strong><span>/ per pen</span></div></div>
            <div className="rs-pack-total">Total: <strong>{money(packTotal(n))}</strong> {offer && <s>{money(unit * n)}</s>}</div>
          </label>)}</div></fieldset>
          <div className="rs-courier"><p><span />SHIPPED BY TRUSTED COURIERS<span /></p><div><span className="rs-royal-mail">Royal Mail</span><strong>Tracked 24</strong></div><p>Shipping options and final charges shown at checkout.</p></div>
          <div className="rs-reassurance">{[<>DELIVERED IN<br />1–2 DAYS</>, <>EXCELLENT<br />CUSTOMER<br />SUPPORT</>, <>SECURE<br />PAYMENT</>].map((label, i) => <div key={i}><Image src={`/sales/badge-${i}.svg`} alt="" width={34} height={34} /><span>{label}</span></div>)}</div>
          <div className="rs-once"><h3><Image src="/sales/badge-3.svg" alt="" width={20} height={20} />This is a one-time purchase only!</h3><p>You won’t receive any additional charges in future months — <strong>no recurring billing or hidden fees.</strong> When you’re ready to order again, simply visit our website.</p></div>
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
    <CertificationReports />
    <RetaFooter />
  </div>;
}

function RetaFooter() {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "447706548345").replace(/\D/g, "");
  return <><footer className="rs-footer">
    <div className="rs-wrap rs-footer-grid">
      <Link href="/" aria-label="Peptbay home" className="rs-footer-logo"><Image src="/sales/peptbay-logo-dark.svg" alt="Peptbay" width={2017} height={530} style={{ width: 180, height: "auto" }} /></Link>
      <div><h3>INFO</h3><Link href="/#commitment">Our commitment</Link><Link href="/testing">Batch documents</Link><Link href="/legal/privacy">Privacy Policy</Link><Link href="/#faq">Catalogue questions</Link></div>
      <div><h3>ORDER</h3><Link href="/shop">All products</Link><Link href="/#faq">FAQ</Link><Link href="/contact">Contact</Link></div>
      <div><h3>CUSTOMER SERVICE</h3><Link href="/contact" className="rs-contact"><Image src="/sales/footer-mail-0.svg" alt="" width={16} height={16} />Contact Peptbay</Link><a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">WhatsApp support</a></div>
      <p className="rs-disclaimer"><strong>Disclaimer:</strong> The statements on this website have not been evaluated by the European Medicines Agency (EMA) or the U.S. Food and Drug Administration (FDA). The products offered by Peptbay are for research purposes only and are not intended to diagnose, treat, cure, or prevent any disease.</p>
    </div>
    <div className="rs-footer-bottom"><div className="rs-wrap"><span>© 2026 Peptbay. All rights reserved.</span><div className="rs-footer-payments" aria-label="Payment providers"><span className="rs-visa">VISA</span><span className="rs-mastercard" role="img" aria-label="Mastercard"><i /><i /></span><span className="rs-gpay">G Pay</span><span className="rs-applepay">Apple Pay</span><span className="rs-klarna">Klarna</span></div></div></div>
  </footer><a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="rs-wa"><span>Need help?</span><span><Image src="/sales/whatsapp.svg" alt="" width={26} height={26} /></span></a></>;
}
