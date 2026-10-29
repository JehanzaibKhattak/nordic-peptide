"use client";
import Script from "next/script";
import { PaymentLogos } from "@/components/store/payment-logos";
import { argentBrowserInfo } from "@/lib/payments/argent-browser";
import { argentEmbeddedSession } from "@/lib/payments/argent-embedded";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatOrderMoney } from "@/lib/money";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";
import type { Address } from "@/lib/types";

type Fields = { submit(): void; unmount(): void };
type EmbeddedSession = ReturnType<typeof argentEmbeddedSession>;
type SDKOptions = EmbeddedSession & { containerId: string; flow: "embedded"; onFieldsLoaded(): void; onFieldsUpdated(value: { complete: boolean }): void; onLoading(value: boolean): void; onPaymentSuccess(): void; onPaymentFailure(): void; onError(error: { message?: string }): void };
declare global { interface Window { ArgentPlatforms?: { init(options: SDKOptions): Fields } } }
type Summary = { items: { id: string; name: string; variantLabel: string; qty: number; lineCents: number }[]; shippingAddress: Address; subtotalCents: number; discountCents: number; shippingCents: number; taxCents: number };

export function ArgentPayment({ token, orderNumber, totalCents, currency, initialStatus, test, canStart, summary }: { token: string; orderNumber: string; totalCents: number; currency: string; initialStatus: string; test: boolean; canStart: boolean; summary: Summary }) {
  const [status, setStatus] = useState(initialStatus), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false), [session, setSession] = useState<EmbeddedSession | null>(null);
  const [fieldsReady, setFieldsReady] = useState(false), [complete, setComplete] = useState(false), [submitted, setSubmitted] = useState(false);
  const fields = useRef<Fields | null>(null);
  const preparationStarted = useRef(false);
  const clearCart = useCart(s => s.clear);
  const paid = ["PAID", "FULFILLED"].includes(status), refunded = status === "REFUNDED";
  const terminal = paid || refunded || ["failed", "EXPIRED", "CANCELLED", "PAYMENT_FAILED"].includes(status);
  const canPrepare = canStart && ["PENDING", "RESERVED", "NOT_STARTED", "draft"].includes(status);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/checkout/argent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: token, action: "refresh" }) });
    const data = await response.json();
    if (!response.ok) throw new Error("Unable to verify payment. Please check again or contact support before paying again.");
    if (data.status) { setStatus(data.status); if (["PAID", "FULFILLED"].includes(data.status)) clearCart(); }
  }, [token, clearCart]);
  const start = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout/argent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: token, action: "start", browserInfo: argentBrowserInfo() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to prepare payment. Please contact support.");
      setSession(argentEmbeddedSession(data.url));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare payment."); }
    finally { setBusy(false); }
  }, [token]);
  useEffect(() => {
    if (!sdkReady || !canPrepare || preparationStarted.current) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled || preparationStarted.current) return;
      preparationStarted.current = true;
      return start();
    });
    return () => { cancelled = true; };
  }, [sdkReady, canPrepare, start]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout/argent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: token, action: "refresh" }) }).then(r => r.json()).then(data => {
      if (!cancelled && data.status) { setStatus(data.status); if (["PAID", "FULFILLED"].includes(data.status)) clearCart(); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, clearCart]);
  useEffect(() => {
    if (!submitted || terminal) return;
    let attempts = 0;
    const timer = window.setInterval(() => { void refresh().catch(() => {}); if (++attempts >= 20) window.clearInterval(timer); }, 3000);
    return () => window.clearInterval(timer);
  }, [submitted, terminal, refresh]);
  useEffect(() => {
    if (!sdkReady || !session || terminal || !window.ArgentPlatforms) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled || !window.ArgentPlatforms) return;
      fields.current = window.ArgentPlatforms.init({ ...session, containerId: "argent-card-fields", flow: "embedded",
        onFieldsLoaded: () => setFieldsReady(true), onFieldsUpdated: value => setComplete(value.complete), onLoading: setBusy,
        onPaymentSuccess: () => { void refresh().catch(() => setError("Payment is being verified. Do not pay again; check its status or contact support.")); },
        onPaymentFailure: () => { setError("Your payment was not completed. Check its status before trying again."); void refresh().catch(() => {}); },
        onError: () => { setBusy(false); setError("Unable to complete card payment. Check its status or contact support before trying again."); },
      });
    }).catch(() => { if (!cancelled) setError("The secure card fields could not load. Please refresh the page or contact support."); });
    return () => { cancelled = true; fields.current?.unmount(); fields.current = null; };
  }, [sdkReady, session, terminal, refresh]);
  async function check() { setBusy(true); setError(""); try { await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify payment."); } finally { setBusy(false); } }
  function pay() {
    if (!fields.current || submitted || !complete) return;
    setSubmitted(true); setBusy(true); setError("");
    try { fields.current.submit(); } catch { setBusy(false); setError("Payment needs verification. Please check its status before trying again."); }
  }
  const address = summary.shippingAddress;
  return <section className="mx-auto max-w-5xl px-5 py-12 text-[#173b2e]">
    <Script src="https://js.argentplatforms.com/payment.min.js" onReady={() => setSdkReady(true)} onError={() => setError("Secure payment could not load. Please refresh or contact support.")} />
    {test && <p className="mb-6 rounded border border-amber-300 bg-amber-50 p-3 font-semibold">Test checkout — not a live order for fulfilment</p>}
    <div className="mb-8"><p className="text-sm uppercase tracking-widest">Peptbay · {orderNumber}</p><h1 className="mt-3 font-serif text-3xl">{paid ? "Payment received" : refunded ? "Payment refunded" : "Complete your payment"}</h1></div>
    <div className="grid gap-8 md:grid-cols-2">
      <aside className="space-y-6 rounded-2xl border border-[#d8dfd5] bg-[#f6f5ef] p-6" aria-label="Order and delivery details">
        <h2 className="text-xl font-semibold">Your order</h2>
        <ul className="divide-y divide-[#d8dfd5]">{summary.items.map(item => <li key={item.id} className="flex justify-between gap-4 py-4"><div><p className="font-semibold">{item.name}</p><p className="text-sm">{item.variantLabel} · Quantity {item.qty}</p></div><span>{formatOrderMoney(item.lineCents, currency)}</span></li>)}</ul>
        <dl className="space-y-2 text-sm">{[["Subtotal", summary.subtotalCents], ["Discount", -summary.discountCents], ["Delivery", summary.shippingCents], ["Tax", summary.taxCents]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><dt>{label}</dt><dd>{formatOrderMoney(Number(value), currency)}</dd></div>)}<div className="flex justify-between border-t border-[#d8dfd5] pt-4 text-xl font-semibold"><dt>Total ({currency})</dt><dd>{formatOrderMoney(totalCents, currency)}</dd></div></dl>
        <div className="border-t border-[#d8dfd5] pt-5"><h2 className="font-semibold">Delivery address</h2><address className="mt-2 text-sm not-italic leading-6">{address.firstName} {address.lastName}<br />{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{address.city}, {address.postcode}<br />{address.country === "GB" ? "United Kingdom" : address.country}</address></div>
      </aside>
      <div className="space-y-5 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{paid ? "Thank you for your order" : "Secure card payment"}</h2>{!paid && !refunded && <PaymentLogos methods={["Visa", "Mastercard"]} />}</div>
        {paid ? <p>Your payment has been verified.{test ? " This test payment will not be sent for fulfilment or affiliate reporting." : " Your order is now with our team."}</p> : refunded ? <p>The full refund has been confirmed by the payment provider.</p> : <>
          {status === "failed" ? <p role="status">Payment declined. Your order is unpaid and has not been accepted for fulfilment. Contact support before starting another payment.</p> : submitted && <p className="text-sm" role="status">Your payment is being verified. Do not submit another payment.</p>}
          {!terminal && canStart && (!session ? (!error && <p role="status" className="text-sm">{canPrepare ? "Loading secure card fields…" : "This payment needs verification. Check its status or contact support before paying again."}</p>) : <><div id="argent-card-fields" className="min-h-52" aria-label="Secure card details" />{!fieldsReady && <p role="status" className="text-sm">Loading secure card fields…</p>}<button className="w-full rounded-lg bg-[#2f7a4d] px-5 py-4 font-semibold text-white disabled:opacity-50" disabled={busy || !complete || submitted} onClick={pay}>{submitted ? "Payment submitted — checking status" : `Pay ${formatOrderMoney(totalCents, currency)}`}</button></>)}
          <button className="text-sm underline disabled:opacity-50" disabled={busy} onClick={check}>Check payment status</button>
        </>}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <p className="border-t border-[#d8dfd5] pt-5 text-xs leading-5">One-time payment. No recurring charges. Payment is verified before dispatch.</p>
        <p className="text-sm"><Link href="/contact" className="underline">Contact Peptbay</Link> · <Link href="/shop" className="underline">Browse products</Link></p>
      </div>
    </div>
  </section>;
}
