import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// de/nl fall back to en for any key they don't define (deep merge).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const en = (await import("../messages/en.json")).default;
  if (locale === "en") return { locale, messages: en };

  let overrides: Record<string, unknown> = {};
  try {
    overrides = (await import(`../messages/${locale}.json`)).default;
  } catch {
    overrides = {};
  }
  return { locale, messages: deepMerge(en, overrides) };
});

function deepMerge<T extends Record<string, unknown>>(base: T, over: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object"
        ? deepMerge(b as Record<string, unknown>, v as Record<string, unknown>)
        : v;
  }
  return out as T;
}
