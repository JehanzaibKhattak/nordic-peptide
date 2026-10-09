"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, Clock, XCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { formatOrderMoney } from "@/lib/money";
import { pushEvent } from "@/components/layout/gtm";
import type { Address } from "@/lib/types";

export type OrderView = {
  orderNumber: string;
  status: string;
  currency: string;
  email: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  trackingNo: string | null;
  shippingAddress: Address;
  items: { id: string; name: string; variantLabel: string; variantId: string; image: string | null; qty: number; unitCents: number; lineCents: number }[];
  payToken: string | null;
};

const PURCHASE_COOKIE = "nps_purchase_";

export function OrderStatus({ initial }: { initial: OrderView }) {
  const t = useTranslations("order");
  const r = useTranslations("research");
  const [order, setOrder] = useState(initial);
  const pending = order.status === "PENDING" || order.status === "RESERVED";

  // Poll while payment is outstanding.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/orders/by-number/${order.orderNumber}`);
      if (r.ok) {
        const d = await r.json();
        if (d.status !== order.status) setOrder((o) => ({ ...o, status: d.status, trackingNo: d.trackingNo, payToken: d.payToken }));
      }
    }, 3000);
    return () => clearInterval(id);
  }, [pending, order.orderNumber, order.status]);

  // Fire `purchase` exactly once per order (cookie-guarded).
  useEffect(() => {
    if (order.status !== "PAID" && order.status !== "FULFILLED") return;
    const key = PURCHASE_COOKIE + order.orderNumber;
    if (document.cookie.includes(`${key}=1`)) return;
    pushEvent("purchase", {
      ecommerce: {
        transaction_id: order.orderNumber,
        currency: order.currency,
        value: order.totalCents / 100,
        shipping: order.shippingCents / 100,
        items: order.items.map((i) => ({ item_id: i.variantId, item_name: i.name, item_variant: i.variantLabel, price: i.unitCents / 100, quantity: i.qty })),
      },
    });
    document.cookie = `${key}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
  }, [order]);

  const head = (() => {
    switch (order.status) {
      case "PAID": return { icon: CheckCircle2, cls: "text-emerald-600", title: t("thanks"), body: t("paidBody", { email: order.email }) };
      case "FULFILLED": return { icon: Truck, cls: "text-emerald-600", title: t("fulfilledTitle"), body: order.trackingNo ? t("tracking", { no: order.trackingNo }) : "" };
      case "PAYMENT_FAILED": return { icon: XCircle, cls: "text-destructive", title: r("failure"), body: "" };
      case "EXPIRED": return { icon: XCircle, cls: "text-muted-foreground", title: t("expiredTitle"), body: t("expiredBody") };
      case "CANCELLED": return { icon: XCircle, cls: "text-muted-foreground", title: t("cancelledTitle"), body: "" };
      case "REFUNDED": return { icon: XCircle, cls: "text-muted-foreground", title: t("refundedTitle"), body: "" };
      default: return { icon: Clock, cls: "text-amber-600", title: t("pendingTitle"), body: t("pendingBody") };
    }
  })();
  const Icon = head.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <Icon className={`mx-auto size-12 ${head.cls}`} />
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("title", { number: order.orderNumber })}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight" data-testid="order-status-title" data-status={order.status}>{head.title}</h1>
        {head.body && <p className="mt-2 text-muted-foreground">{head.body}</p>}
        {pending && order.payToken && (
          <Button className="mt-6" render={<Link href={`/checkout/pay?session=${order.payToken}`} />}>{t("payNow")}</Button>
        )}
      </div>

      <div className="mt-10 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">{t("items")}</h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 text-sm">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}</div>
              <div className="flex-1"><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.variantLabel} × {i.qty}</p></div>
              <span>{formatOrderMoney(i.lineCents, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t pt-3 text-sm font-semibold"><span>Total</span><span>{formatOrderMoney(order.totalCents, order.currency)}</span></div>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-5 text-sm">
        <h2 className="text-sm font-semibold">{t("shipTo")}</h2>
        <p className="mt-2">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
        <p className="text-muted-foreground">{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />{order.shippingAddress.postcode} {order.shippingAddress.city}, {order.shippingAddress.country}</p>
      </div>
    </div>
  );
}
