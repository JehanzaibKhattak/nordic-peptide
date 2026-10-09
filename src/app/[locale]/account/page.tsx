import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentPurchaser } from "@/lib/purchaser-session";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestCode, verifyCode, submitResearchApplication, signOut } from "./actions";

export const metadata = { title: "Research account · Avion-PEPT", robots: { index: false } };

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ message?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("research");
  const { message } = await searchParams;
  const p = await currentPurchaser();
  const orders = p ? await db.order.findMany({ where: { purchaserId: p.id }, orderBy: { createdAt: "desc" }, take: 100 }) : [];
  const hidden = <input type="hidden" name="locale" value={locale} />;
  return <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
    <h1 className="text-3xl font-semibold">{t("title")}</h1>
    {message && ["code_sent", "invalid_code", "submitted", "rate_limited"].includes(message) && <p role="status">{t(message)}</p>}
    {!p ? <div className="grid gap-8 sm:grid-cols-2">
      <form action={requestCode} className="space-y-4">{hidden}<h2>{t("signIn")}</h2><label className="block">{t("email")}<Input name="email" type="email" required maxLength={254} autoComplete="email" /></label><Button>{t("sendCode")}</Button></form>
      <form action={verifyCode} className="space-y-4">{hidden}<h2>{t("verify")}</h2><label className="block">{t("email")}<Input name="email" type="email" required autoComplete="email" /></label><label className="block">{t("code")}<Input name="code" required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" /></label><Button>{t("signIn")}</Button></form>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-4"><p>{p.email} · {t(`status.${p.status}`)}</p><form action={signOut}>{hidden}<Button variant="outline">{t("signOut")}</Button></form></div>
      {p.approvedUntil && <p>{t("validUntil")}: {p.approvedUntil.toISOString().slice(0, 10)}</p>}
      <p>{t("reviewNotice")}</p>
      <form action={submitResearchApplication} className="space-y-4 rounded-2xl border p-6">{hidden}
        <h2 className="text-xl font-semibold">{t("application")}</h2>
        {(["organization", "registrationId", "website"] as const).map(name => <label key={name} className="block">{t(name)}<Input name={name} required type={name === "website" ? "url" : "text"} defaultValue={p[name]} maxLength={name === "website" ? 500 : 200} /></label>)}
        <label className="block">{t("researchPurpose")}<textarea name="researchPurpose" required minLength={40} maxLength={4000} defaultValue={p.researchPurpose} className="min-h-32 w-full rounded-md border p-3" /></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="researchOnly" required className="mt-1" />{t("attestation")}</label>
        <Button>{t("submit")}</Button>
      </form>
      <Link href="/checkout" className="underline">{t("checkout")}</Link>
      <section className="space-y-3"><h2 className="text-xl font-semibold">{t("history")}</h2>{!orders.length && <p>{t("noOrders")}</p>}{orders.map(o => <Link key={o.id} href={`/order/${o.orderNumber}`} className="flex flex-wrap justify-between gap-3 rounded-xl border p-4"><span>{o.orderNumber} · {o.createdAt.toISOString().slice(0, 10)}</span><span>{o.status} · {new Intl.NumberFormat(locale, { style: "currency", currency: o.currency }).format(o.totalCents / 100)}</span></Link>)}</section>
    </>}
  </main>;
}
