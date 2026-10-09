"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { loadDemoCheckout, saveDemoOrder, type DemoCheckoutDraft } from "@/lib/demo-checkout";

const successCard = "4242424242424242";
const declinedCard = "4000000000000002";

export function DemoPaymentPage({ token }: { token: string }) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const router = useRouter();
  const clearCart = useCart((state) => state.clear);
  const [draft, setDraft] = useState<DemoCheckoutDraft | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    setDraft(loadDemoCheckout(token));
  }, [token]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setError("");
    setBusy(true);
    const normalized = cardNumber.replace(/\D/g, "");
    if (normalized === declinedCard) {
      setError(t("demoDeclined"));
      setBusy(false);
      return;
    }
    if (normalized !== successCard) {
      setError(t("demoCardHint"));
      setBusy(false);
      return;
    }

    const orderNumber = `DEMO-${Date.now().toString().slice(-8)}`;
    saveDemoOrder({ ...draft, orderNumber, paidAt: new Date().toISOString() });
    clearCart();
    router.replace(`/demo-order/${orderNumber}`);
  };

  if (!draft) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("demoSessionMissing")}</h1>
      <p className="mt-2 text-muted-foreground">{t("demoSessionMissingBody")}</p>
      <Button className="mt-6" render={<Link href="/shop" />}>{t("backToStore")}</Button>
    </div>;
  }

  return <div className="mx-auto max-w-6xl px-4 py-10">
    <p className="mb-8 rounded-xl border border-[#d9dfd5] bg-[#edf1e9] px-4 py-3 text-sm text-[#435d4e]">{t("demoCheckoutNotice")}</p>
    <div className="grid gap-10 lg:grid-cols-2">
      <aside className="space-y-5">
        <Link href="/checkout" className="text-sm text-muted-foreground underline">{t("backToDetails")}</Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("step2")}</p>
          <h1 className="mt-2 text-2xl font-semibold">{t("completeOrder")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{draft.email}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">{t("orderSummary")}</h2>
          <ul className="mt-4 space-y-3">
            {draft.items.map((item) => <li key={item.variantId} className="flex items-center gap-3 text-sm">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary"><Image src={item.image} alt="" fill sizes="56px" className="object-cover" /></div>
              <div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.variantLabel} × {item.qty}</p></div>
              <span>{formatMoney(item.unitCents * item.qty, "EUR")}</span>
            </li>)}
          </ul>
          <Separator className="my-4" />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{tc("subtotal")}</dt><dd>{formatMoney(draft.subtotalCents, "EUR")}</dd></div>
            {draft.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{tc("discount")} ({draft.couponCode})</dt><dd>−{formatMoney(draft.discountCents, "EUR")}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">{tc("shipping")}</dt><dd>{draft.shippingCents === 0 ? tc("free") : formatMoney(draft.shippingCents, "EUR")}</dd></div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold"><dt>{tc("total")}</dt><dd>{formatMoney(draft.totalCents, "EUR")}</dd></div>
          </dl>
        </div>
      </aside>

      <section className="lg:pt-8">
        <div className="rounded-2xl border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("demoPaymentTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("demoPaymentBody")}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="demo-card-number">{t("mock.cardNumber")}</Label><Input id="demo-card-number" inputMode="numeric" autoComplete="off" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="4242 4242 4242 4242" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="demo-expiry">{t("mock.expiry")}</Label><Input id="demo-expiry" autoComplete="off" value={expiry} onChange={(event) => setExpiry(event.target.value)} placeholder="12 / 29" required /></div>
              <div className="space-y-1.5"><Label htmlFor="demo-cvc">{t("mock.cvc")}</Label><Input id="demo-cvc" autoComplete="off" inputMode="numeric" value={cvc} onChange={(event) => setCvc(event.target.value)} placeholder="123" required /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="demo-card-name">{t("mock.name")}</Label><Input id="demo-card-name" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} required /></div>
            <p className="text-xs text-muted-foreground">{t("demoCardHint")}</p>
            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? t("paying") : t("demoPay", { amount: formatMoney(draft.totalCents, "EUR") })}</Button>
            <p className="text-center text-xs text-muted-foreground">{t("demoNoCharge")}</p>
          </form>
        </div>
      </section>
    </div>
  </div>;
}
