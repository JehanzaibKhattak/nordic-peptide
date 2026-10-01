"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Truck, Package } from "lucide-react";
import { CountryDialog } from "@/components/layout/country-dialog";
import { useCart } from "@/lib/cart-store";
import { SHIPPING_COUNTRIES, deliveryEstimate, flagEmoji, formatDateRange } from "@/config/shipping";
import { useHydrated } from "@/lib/use-hydrated";

function fmtCountdown(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function DeliveryEstimate() {
  const t = useTranslations("product.delivery");
  const locale = useLocale();
  const country = useCart((s) => s.country);
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Time-dependent copy: render only after hydration to avoid SSR mismatch.
  if (!hydrated) return <div className="h-28 animate-pulse rounded-xl bg-secondary" />;

  const est = deliveryEstimate(country, "standard", now);
  const name = SHIPPING_COUNTRIES.find((c) => c.code === country)?.name ?? country;

  return (
    <div className="rounded-xl border bg-secondary/40 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          <Truck className="mr-1.5 inline size-4" />
          {t("title", { country: `${flagEmoji(country)} ${name}` })}
        </p>
        <CountryDialog>
          <button className="text-xs font-medium uppercase tracking-wide underline-offset-2 hover:underline">{t("change")}</button>
        </CountryDialog>
      </div>
      <p className="mt-2">{t("arrives", { range: formatDateRange(est.from, est.to, locale) })}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {est.cutoffPassed ? t("cutoffPassed") : t("cutoffIn", { time: fmtCountdown(est.msToCutoff) })}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded border bg-background px-2 py-0.5 font-medium">{est.carriers[0]}</span>
        <span className="flex items-center gap-1"><Package className="size-3.5" />{t("discreet")}</span>
      </div>
    </div>
  );
}
