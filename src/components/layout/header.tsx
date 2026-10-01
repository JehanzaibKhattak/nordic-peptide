"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";
import { flagEmoji } from "@/config/shipping";
import { currencyForCountry } from "@/lib/money";
import { CountryDialog } from "./country-dialog";
import { LocaleSwitcher } from "./locale-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { ChevronDown, Globe2, ShoppingBag } from "lucide-react";

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const country = useCart((s) => s.country);
  const mounted = useHydrated();

  const nav = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/testing", label: t("nav.testing") },
    { href: "/calculator", label: t("nav.calculator") },
    { href: "/contact", label: t("nav.contact") },
  ];
  const currency = currencyForCountry(country);
  const currencySymbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : "€";

  return (
    <header className="sticky top-0 z-40 border-b border-[#e1dbce] bg-[#fffdf8]">
      <div className="mx-auto flex h-[72px] max-w-[1264px] items-center gap-6 px-4 md:px-0">
        <Link href="/" className="shrink-0 font-semibold tracking-tight text-primary sm:text-xl" aria-label="Avion-PEPT home">
          Avion-PEPT
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.11em] text-[#294238] transition-colors hover:text-[#9a754d]",
                pathname.startsWith(item.href) && "text-[#9a754d]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <CountryDialog>
            <Button variant="ghost" size="sm" className="gap-1 px-1.5 text-sm text-[#586a5e] hover:bg-transparent">
              <span aria-hidden="true">{mounted ? flagEmoji(country) : "🌍"}</span>
              <span>{mounted ? country : ""}</span>
              <ChevronDown aria-hidden="true" className="size-3" />
            </Button>
          </CountryDialog>
          <span className="hidden items-center gap-1 text-sm text-[#586a5e] sm:inline-flex" aria-label={`Currency ${currency}`}>
            {currencySymbol} {currency} <ChevronDown aria-hidden="true" className="size-3" />
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Globe2 aria-hidden="true" className="size-4 text-[#829083]" />
            <LocaleSwitcher />
            <ChevronDown aria-hidden="true" className="size-3 text-[#829083]" />
          </span>
          <Link href="/cart" className="grid size-9 place-items-center text-primary transition-colors hover:text-[#9a754d]" aria-label={t("nav.cart")}>
            <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      <nav className="flex gap-6 overflow-x-auto border-t border-[#e1dbce] px-4 py-2.5 text-xs lg:hidden" aria-label="Main navigation">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap font-medium uppercase tracking-[0.1em] text-[#52685b]">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
