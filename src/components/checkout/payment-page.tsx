"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, Lock, ShieldCheck, Info, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import type { Address } from "@/lib/types";
import { useCart } from "@/lib/cart-store";

type SessionData = {
  ok: true;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    locale: string;
    email: string;
    subtotalCents: number;
    shippingCents: number;
    discountCents: number;
    taxCents: number;
    totalCents: number;
    couponCode: string | null;
    shippingMethod: string;
    shippingAddress: Address;
    billingAddress: Address;
    items: { id: string; name: string; variantLabel: string; image: string | null; qty: number; lineCents: number }[];
  };
  expiresAt: string;
  adapters: { id: string; label: string }[];
  legalEntity: string;
  brand: string;
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PaymentPage({ token }: { token: string }) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const clear = useCart((s) => s.clear);
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expired, setExpired] = useState(false);
  const [adapter, setAdapter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/checkout/session?token=${encodeURIComponent(token)}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok || !d.ok) {
          if (d.error === "expired") setExpired(true);
          else setError(d.error ?? "not_found");
          return;
        }
        setData(d);
        setAdapter(d.adapters[0]?.id ?? "");
        if (d.order.status === "PAID") router.replace(`/${locale}/order/${d.order.orderNumber}`);
      })
      .catch(() => !cancelled && setError("network_error"));
    return () => {
      cancelled = true;
    };
  }, [token, locale, router]);

  const end = data ? new Date(data.expiresAt).getTime() : 0;
  const left = end - now;

  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (end - t <= 0) {
        setExpired(true);
        fetch(`/api/checkout/session?token=${encodeURIComponent(token)}`); // triggers lazy expiry server-side
      }
    }, 1000);
    return () => clearInterval(id);
  }, [data, end, token]);

  if (expired) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">{t("expiredTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("expiredBody")}</p>
        <Button className="mt-6" render={<Link href="/shop" />}>{t("backToStore")}</Button>
      </div>
    );
  }
  if (error) return <div className="mx-auto max-w-md px-4 py-24 text-center text-destructive">{error}</div>;
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-12"><div className="h-96 animate-pulse rounded-2xl bg-secondary" /></div>;

  const { order } = data;

  return (
    <div>
      <div className="bg-emerald-600 text-white">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-sm">
          {t.rich("reservedFor", { time: () => <strong className="tabular-nums" data-testid="countdown">{fmt(left)}</strong> })}
          <span className="ml-1 inline-flex cursor-help" title={t("reservedHelp")}><Info className="size-3.5" /></span>
        </p>
      </div>
      <div className="border-b bg-secondary/60 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5">
          <span className="flex items-center gap-1"><Lock className="size-3" />{t("secure")}</span>
          <span className="flex items-center gap-2">{typeof window !== "undefined" ? window.location.host : ""} <span className="rounded border bg-background px-1.5 py-0.5 font-medium">PCI DSS</span></span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_1fr]">
        <aside className="space-y-6 lg:order-1">
          <Link href="/shop" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("backToStore")}</Link>
          <div>
            <p className="font-semibold">{data.brand}</p>
            <h2 className="mt-4 text-sm font-semibold">{t("orderSummary")} · {order.orderNumber}</h2>
          </div>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 text-sm">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                <div className="flex-1"><p className="font-medium leading-tight">{i.name}</p><p className="text-xs text-muted-foreground">{i.variantLabel} × {i.qty}</p></div>
                <span>{formatMoney(i.lineCents)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{tc("subtotal")}</dt><dd>{formatMoney(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{tc("shipping")}</dt><dd>{order.shippingCents === 0 ? tc("free") : formatMoney(order.shippingCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("tax")}</dt><dd>{formatMoney(order.taxCents)}</dd></div>
            {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{tc("discount")}</dt><dd>−{formatMoney(order.discountCents)}</dd></div>}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold"><dt>{tc("total")}</dt><dd data-testid="pay-total">{formatMoney(order.totalCents)}</dd></div>
          </dl>
          <div className="grid gap-3 sm:grid-cols-2">
            <AddressCard title={t("shipTo")} a={order.shippingAddress} />
            <AddressCard title={t("billing")} a={order.billingAddress} />
          </div>
        </aside>

        <section className="lg:order-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("step2")}</p>
            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"><ShieldCheck className="size-3" />{t("encrypted")}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("completeOrder")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("methodsLine")}</p>
          <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs">{t.rich("statementNotice", { entity: data.legalEntity, b: (c) => <strong>{c}</strong> })}</p>

          <div className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">{t("paymentMethod")}</h2>
            <div className="mt-3 flex gap-2">
              {data.adapters.map((a) => (
                <button key={a.id} onClick={() => setAdapter(a.id)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${adapter === a.id ? "border-primary bg-accent/60" : ""}`}>
                  <CreditCard className="size-4" />{a.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              {adapter === "mock" && <MockCardForm token={token} total={order.totalCents} onPaid={(n) => { clear(); router.replace(`/${locale}/order/${n}`); }} />}
              {adapter && adapter !== "mock" && <RedirectPay key={adapter} token={token} adapterId={adapter} total={order.totalCents} onBeforeRedirect={clear} />}
              {!adapter && <p className="text-sm text-muted-foreground">No payment methods enabled.</p>}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("agreeLine")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AddressCard({ title, a }: { title: string; a: Address }) {
  return (
    <div className="rounded-xl border p-3 text-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 font-medium">{a.firstName} {a.lastName}</p>
      <p className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.postcode} {a.city}, {a.country}</p>
    </div>
  );
}

function MockCardForm({ token, total, onPaid }: { token: string; total: number; onPaid: (orderNumber: string) => void }) {
  const t = useTranslations("checkout");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/checkout/mock-confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, cardNumber: card }) });
    const d = await r.json();
    if (d.ok) onPaid(d.orderNumber);
    else {
      setErr(d.error === "declined" ? t("mock.declined") : d.error ?? "error");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} className="space-y-3" data-testid="mock-card-form">
      <div className="space-y-1.5"><Label htmlFor="card">{t("mock.cardNumber")}</Label><Input id="card" inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="exp">{t("mock.expiry")}</Label><Input id="exp" value={exp} onChange={(e) => setExp(e.target.value)} placeholder="12 / 29" required /></div>
        <div className="space-y-1.5"><Label htmlFor="cvc">{t("mock.cvc")}</Label><Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" required /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="name">{t("mock.name")}</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="pay-button">{busy ? t("paying") : t("pay", { amount: formatMoney(total) })}</Button>
      <p className="text-[11px] text-muted-foreground">{t("mock.hint")}</p>
    </form>
  );
}

function RedirectPay({ token, adapterId, total, onBeforeRedirect }: { token: string; adapterId: string; total: number; onBeforeRedirect: () => void }) {
  const t = useTranslations("checkout");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const go = async () => {
    setBusy(true);
    setFailed(false);
    const r = await fetch("/api/checkout/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, adapterId }) });
    const d = await r.json().catch(() => ({}));
    if (d.kind === "redirect") {
      onBeforeRedirect();
      window.location.assign(d.url);
    } else {
      setFailed(true);
      setBusy(false);
    }
  };
  return (
    <>
      {failed && <p className="mb-3 text-sm text-destructive">{t("providerError")}</p>}
      <Button size="lg" className="w-full" onClick={go} disabled={busy} data-testid="redirect-pay-button">{busy ? t("paying") : t("pay", { amount: formatMoney(total) })}</Button>
    </>
  );
}
