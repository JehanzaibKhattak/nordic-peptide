"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import { LOCALES } from "@/lib/types";

const LABELS: Record<string, string> = { en: "EN", es: "ES", de: "DE", nl: "NL" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <select
      aria-label="Language"
      className="h-8 rounded-full border bg-background px-2 text-xs"
      value={locale}
      onChange={(e) => {
        // @ts-expect-error -- pathname/params come from the current route and match
        router.replace({ pathname, params }, { locale: e.target.value });
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
