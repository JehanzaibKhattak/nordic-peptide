"use client";
import { argentBrowserInfo } from "@/lib/payments/argent-browser";
import { useEffect, useState } from "react";
import { formatOrderMoney } from "@/lib/money";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";

export function ArgentPayment({ token, orderNumber, totalCents, currency, initialStatus, test, canStart }: { token: string; orderNumber: string; totalCents: number; currency: string; initialStatus: string; test: boolean; canStart: boolean }) {
  const [status, setStatus] = useState(initialStatus), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const clearCart = useCart(s => s.clear);
  async function request(action: "start" | "refresh") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout/argent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: token, action, ...(action === "start" ? { browserInfo: argentBrowserInfo() } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to verify payment. Please contact support.");
      if (action === "start" && data.url) { window.location.assign(data.url); return; }
      if (data.status) { setStatus(data.status); if (["PAID", "FULFILLED"].includes(data.status)) clearCart(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify payment."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    // Returning query parameters are deliberately ignored; the server checks its saved intent.
    let cancelled = false;
    fetch("/api/checkout/argent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: token, action: "refresh" }) }).then(r => r.json()).then(data => { if (!cancelled && data.status) { setStatus(data.status); if (["PAID", "FULFILLED"].includes(data.status)) clearCart(); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, clearCart]);
  const paid = ["PAID", "FULFILLED"].includes(status), refunded = status === "REFUNDED";
  return <section className="mx-auto max-w-xl space-y-6 px-5 py-16 text-center text-[#173b2e]">
    {test && <p className="rounded border border-amber-300 bg-amber-50 p-3 font-semibold">Test checkout — not a live order for fulfilment</p>}
    <h1 className="font-serif text-3xl">{paid ? "Payment received" : refunded ? "Payment refunded" : "Secure card payment"}</h1>
    <p>{orderNumber}</p><p className="text-2xl font-semibold">{formatOrderMoney(totalCents, currency)}</p>
    {paid ? <p>Your payment has been verified.{test ? " This test payment will not be sent for fulfilment or affiliate reporting." : " Your order is now with our team."}</p> : refunded ? <p>The full refund has been confirmed by the payment provider.</p> : <><p>You’ll enter your payment details on Argent’s secure hosted page. We confirm the order after the payment is verified.</p><p className="text-sm">{status === "failed" ? "Payment declined. Your order is unpaid and has not been accepted for fulfilment. Contact support before starting another payment." : `Status: ${status.replaceAll("_", " ")}`}</p>{canStart && ["PENDING", "RESERVED", "NOT_STARTED", "draft"].includes(status) && <button className="w-full rounded bg-[#2f7a4d] px-5 py-4 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => request("start")}>Continue to secure payment</button>}<button className="underline disabled:opacity-50" disabled={busy} onClick={() => request("refresh")}>Check payment status</button></>}
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <p><Link href="/contact" className="underline">Contact support</Link> · <Link href="/shop" className="underline">Browse products</Link></p>
  </section>;
}
