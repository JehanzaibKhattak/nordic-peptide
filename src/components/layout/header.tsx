"use client";

import { useLocale, useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useCart, cartCount } from "@/lib/cart-store";
import { t as lt } from "@/lib/types";
import { flagEmoji } from "@/config/shipping";
import { CountryDialog } from "./country-dialog";
import { LocaleSwitcher } from "./locale-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

type Cat = { slug: string; name: Record<string, string> };

export function Header({ categories }: { categories: Cat[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const country = useCart((s) => s.country);
  const open = useCart((s) => s.open);
  const mounted = useHydrated();
  const count = mounted ? cartCount(items) : 0;

  const nav = [
    { href: "/shop", label: t("nav.shop") },
    ...categories.slice(0, 2).map((c) => ({ href: `/shop/${c.slug}`, label: lt(c.name, locale) })),
    { href: "/testing", label: t("nav.testing") },
    { href: "/journal", label: t("nav.journal") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="bg-primary text-primary-foreground">
        <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs tracking-wide">{t("banner")}</p>
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">N</span>
          <span className="hidden text-base font-semibold tracking-tight sm:inline">{t("brand.name")}</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-5 text-sm md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "text-muted-foreground transition-colors hover:text-foreground",
                pathname.startsWith(n.href) && "text-foreground font-medium",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <CountryDialog>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full px-3" aria-label={t("nav.shipTo")}>
              <span aria-hidden>{mounted ? flagEmoji(country) : "🌍"}</span>
              <span className="hidden text-xs sm:inline">{mounted ? country : ""}</span>
            </Button>
          </CountryDialog>
          <LocaleSwitcher />
          <Button variant="ghost" size="sm" className="relative" onClick={open} aria-label={t("nav.cart")}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-sm md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap text-muted-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
