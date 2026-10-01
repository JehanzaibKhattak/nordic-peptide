"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useWindowEventValue } from "@/lib/use-hydrated";

export const CONSENT_KEY = "nps-consent"; // "all" | "necessary"
export const CONSENT_EVENT = "nps:consent";

export function readConsent(): "all" | "necessary" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

/** Current consent choice; "pending" on the server so nothing flashes before hydration. */
export function useConsent() {
  return useWindowEventValue<"all" | "necessary" | null | "pending">(CONSENT_EVENT, readConsent, "pending");
}

export function ConsentBanner() {
  const t = useTranslations("consent");
  const consent = useConsent();
  if (consent !== null) return null;

  const choose = (v: "all" | "necessary") => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {}
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
  };

  return (
    <div role="dialog" aria-label={t("title")} className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border bg-card p-4 shadow-lg">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => choose("all")}>{t("accept")}</Button>
        <Button size="sm" variant="outline" onClick={() => choose("necessary")}>{t("necessary")}</Button>
      </div>
    </div>
  );
}
