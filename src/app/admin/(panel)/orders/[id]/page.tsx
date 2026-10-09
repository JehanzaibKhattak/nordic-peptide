import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatOrderMoney } from "@/lib/money";
import type { Address, Affiliate } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reconcilePaymentAction, cancelAction, fulfilAction, markPaidAction, refundAction, resendEmailAction, resendPostbackAction } from "../../../actions";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
  if (!o) notFound();
  const ship = o.shippingAddress as Address;
  const bill = o.billingAddress as Address;
  const aff = o.affiliate as Affiliate | null;
  const payable = o.status === "RESERVED" || o.status === "PENDING";
  const paid = o.status === "PAID" && o.paymentProvider !== "stripe";
  const refundable = o.status === "PAID" || o.status === "FULFILLED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Orders</Link>
        <h1 className="font-mono text-xl font-semibold">{o.orderNumber}</h1>
        <Badge variant="outline">{o.status}</Badge>
        <span className="text-sm text-muted-foreground">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
      </div>

      {o.paymentProvider === "stripe" && <p className="rounded-xl border p-4">Stripe test order — no real funds collected. Do not dispatch goods for test payments.</p>}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        {o.stripeSessionId && <form action={reconcilePaymentAction}><input type="hidden" name="id" value={o.id} /><Button variant="outline">Reconcile Stripe status</Button></form>}
        {payable && (
          <>
            {!o.purchaserId && <form action={markPaidAction}><input type="hidden" name="id" value={o.id} /><Button type="submit">Mark paid</Button></form>}
            <form action={cancelAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" variant="outline">{o.paymentProvider === "stripe" ? "Expire Stripe session" : "Cancel order"}</Button></form>
          </>
        )}
        {paid && (
          <form action={fulfilAction} className="flex items-end gap-2">
            <input type="hidden" name="id" value={o.id} />
            <Input name="trackingNo" placeholder="Tracking number" className="w-56" />
            <Button type="submit">Mark fulfilled</Button>
          </form>
        )}
        {refundable && <form action={refundAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" variant="destructive">Refund</Button></form>}
        {(refundable || o.status === "REFUNDED") && (
          <>
            <form action={resendPostbackAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" variant="outline">Resend postback</Button></form>
            <form action={resendEmailAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" variant="outline">Resend email</Button></form>
          </>
        )}
        {!payable && !refundable && o.status !== "REFUNDED" && <p className="text-sm text-muted-foreground">No actions available for {o.status} orders.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Items</h2>
          <ul className="mt-3 divide-y text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between py-2"><span>{i.qty} × {i.name} <span className="text-muted-foreground">({i.variantLabel})</span></span><span>{formatOrderMoney(i.lineCents, o.currency)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatOrderMoney(o.subtotalCents, o.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping ({o.shippingMethod})</dt><dd>{formatOrderMoney(o.shippingCents, o.currency)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount ({o.couponCode})</dt><dd>−{formatOrderMoney(o.discountCents, o.currency)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatOrderMoney(o.totalCents, o.currency)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-2">{o.email}</p>
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Ship to</p>
            <Addr a={ship} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Billing</p>
            <Addr a={bill} />
            {o.trackingNo && <p className="mt-3">Tracking: <span className="font-mono">{o.trackingNo}</span></p>}
          </section>
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Payment</h2>
            <p className="mt-2 text-muted-foreground">Provider: {o.paymentProvider ?? "—"}</p>
            <p className="break-all text-muted-foreground">Ref: {o.providerRef ?? "—"}</p>
          </section>
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Affiliate</h2>
            {aff ? (
              <dl className="mt-2 space-y-1 font-mono text-xs">
                {Object.entries(aff).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="break-all text-right">{String(v)}</dd></div>)}
              </dl>
            ) : <p className="mt-2 text-muted-foreground">No attribution.</p>}
          </section>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Events</h2>
        <ol className="mt-3 space-y-2 text-xs">
          {o.events.map((e) => (
            <li key={e.id} className="grid gap-1 sm:grid-cols-[150px_170px_1fr]">
              <span className="text-muted-foreground">{e.createdAt.toISOString().slice(0, 19).replace("T", " ")}</span>
              <span className="font-mono font-medium">{e.type}</span>
              <code className="break-all text-muted-foreground">{JSON.stringify(e.payload)}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Addr({ a }: { a: Address }) {
  return (
    <p className="text-muted-foreground">
      {a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.postcode} {a.city}, {a.country}{a.phone ? <><br />{a.phone}</> : null}
    </p>
  );
}
