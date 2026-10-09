"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BadgeCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { loadDemoOrder, type DemoOrder } from "@/lib/demo-checkout";

export function DemoOrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const [order, setOrder] = useState<DemoOrder | null>(null);

  useEffect(() => setOrder(loadDemoOrder(orderNumber)), [orderNumber]);

  if (!order) return <div className="mx-auto max-w-2xl px-4 py-24 text-center">
    <Info className="mx-auto size-10 text-muted-foreground" />
    <h1 className="mt-4 text-2xl font-semibold">{t("demoOrderUnavailable")}</h1>
    <p className="mt-2 text-muted-foreground">{t("demoOrderUnavailableBody")}</p>
    <Button className="mt-6" render={<Link href="/shop" />}>{t("backToStore")}</Button>
  </div>;

  const address = order.shippingAddress;
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
    <div className="text-center">
      <BadgeCheck className="mx-auto size-12 text-[#2d6047]" />
      <p className="mt-4 text-xs font-medium uppercase tracking-widest text-[#788b76]">{t("demoConfirmationEyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#18382b]">{t("demoConfirmationTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("demoConfirmationBody")}</p>
      <p className="mt-4 inline-flex rounded-full bg-[#edf1e9] px-3 py-1 text-sm font-medium text-[#435d4e]">{order.orderNumber}</p>
    </div>

    <div className="mt-9 rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="font-semibold">{tc("title")}</h2>
      <ul className="mt-4 space-y-4">
        {order.items.map((item) => <li key={item.variantId} className="flex items-center gap-3 text-sm">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary"><Image src={item.image} alt="" fill sizes="56px" className="object-cover" /></div>
          <div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.variantLabel} × {item.qty}</p></div>
          <span>{formatMoney(item.unitCents * item.qty, "EUR")}</span>
        </li>)}
      </ul>
      <div className="mt-5 flex justify-between border-t pt-4 font-semibold"><span>{tc("total")}</span><span>{formatMoney(order.totalCents, "EUR")}</span></div>
      <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("email")}</p><p className="mt-1 text-sm">{order.email}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("shipTo")}</p><p className="mt-1 text-sm">{address.firstName} {address.lastName}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.postcode} {address.city}, {address.country}</p></div>
      </div>
    </div>
    <p className="mt-5 rounded-xl border border-[#e5dfd2] bg-[#f6f2e9] px-4 py-3 text-sm text-[#56665c]">{t("demoNoCharge")}</p>
    <div className="mt-6 text-center"><Button render={<Link href="/shop" />}>{t("backToStore")}</Button></div>
  </main>;
}
