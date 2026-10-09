"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitcher } from "./locale-switcher";
import { CurrencySwitcher } from "./currency-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Globe2, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const itemCount = useCart((state) => cartCount(state.items));
  const openCart = useCart((state) => state.open);
  const hydrated = useHydrated();
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftSubmitted, setGiftSubmitted] = useState(false);
  const nav = [
    { href: "/shop", label: t("nav.shop") },
  ];

  return (
    <header className="sticky top-0 z-40">
      {announcementOpen && (
        <div className="relative flex h-9 items-center justify-center bg-[#28563e] px-10 text-center text-[11px] font-semibold text-white sm:px-12 sm:text-sm">
          <span className="whitespace-nowrap"><span className="sm:hidden">Research-grade peptides</span><span className="hidden sm:inline">Research-grade peptides for laboratories</span></span>
          <button type="button" onClick={() => { setGiftSubmitted(false); setGiftOpen(true); }} className="ml-2 whitespace-nowrap rounded-full border border-white/35 px-2 py-1 text-[10px] leading-none hover:bg-white/10 sm:ml-3 sm:px-3 sm:text-sm">Reveal a gift</button>
          <button type="button" onClick={() => setAnnouncementOpen(false)} aria-label="Dismiss announcement" className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-white/90 hover:bg-white/10">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
      <div className="border-b border-[#e1dbce] bg-[#fffdf8]">
        <div className="mx-auto flex h-[72px] max-w-[1264px] items-center gap-6 px-4 md:px-8">
          <Link href="/" className="shrink-0 font-semibold tracking-tight text-primary sm:text-xl" aria-label="Avion-PEPT home">Avion-PEPT</Link>
          <nav className="hidden flex-1 items-center justify-center gap-4 md:flex xl:gap-7" aria-label="Main navigation">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={cn("whitespace-nowrap text-xs font-medium uppercase tracking-[0.1em] text-[#294238] transition-colors hover:text-[#9a754d] xl:text-[13px] xl:tracking-[0.11em]", item.href.startsWith("/#") ? undefined : pathname.startsWith(item.href) && "text-[#9a754d]")}>{item.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            {!BROWSE_ONLY && <Link href="/account" aria-label={t("research.accountLink")} className="grid size-9 place-items-center text-primary"><UserRound className="size-5" aria-hidden="true" /></Link>}
            <CurrencySwitcher />
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Globe2 aria-hidden="true" className="size-4 text-[#829083]" />
              <LocaleSwitcher />
              <ChevronDown aria-hidden="true" className="size-3 text-[#829083]" />
            </span>
            <button type="button" onClick={openCart} aria-label={`${t("nav.cart")}${hydrated && itemCount ? `: ${itemCount}` : ""}`} className="relative grid size-9 place-items-center text-primary transition-colors hover:text-[#9a754d]">
              <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.8} />
              {hydrated && itemCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#28563e] px-1 text-[10px] font-semibold leading-none text-white">{itemCount > 99 ? "99+" : itemCount}</span>}
            </button>
          </div>
        </div>
        <nav className="flex gap-6 overflow-x-auto border-t border-[#e1dbce] px-4 py-2.5 text-xs md:hidden" aria-label="Main navigation">
          {nav.map((item) => <Link key={item.href} href={item.href} className="whitespace-nowrap font-medium uppercase tracking-[0.1em] text-[#52685b]">{item.label}</Link>)}
        </nav>
      </div>
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto rounded-2xl border border-[#d9d1c1] bg-[#f6f2e9] p-6 text-[#193b2e] shadow-2xl sm:max-w-[720px] sm:rounded-[20px] sm:p-9">
          <DialogClose render={<button type="button" aria-label="Close welcome offer" className="absolute right-4 top-4 rounded p-1 text-[#637568] hover:bg-[#e8e4dc] sm:right-6 sm:top-6" />}><X aria-hidden="true" className="size-5" /></DialogClose>
          <DialogTitle className="pr-8 font-serif text-3xl font-semibold leading-tight text-[#193b2e] sm:text-4xl">10% Welcome discount</DialogTitle>
          <DialogDescription className="mt-3 text-base leading-6 text-[#788c70] sm:text-xl sm:leading-7">Try Avion-PEPT and get 10% off your first order.</DialogDescription>
          <form className="mt-6 sm:mt-8" onSubmit={(event) => { event.preventDefault(); setGiftSubmitted(true); }}>
            <label htmlFor="gift-email" className="mb-2 block text-base font-medium text-[#193b2e] sm:text-lg">Email</label>
            <Input id="gift-email" type="email" autoComplete="email" required className="h-14 rounded-xl border-2 border-[#315b43] bg-white px-4 text-base ring-4 ring-[#aeb9a6]/50 focus-visible:ring-[#aeb9a6]" />
            <Button type="submit" className="mt-5 h-14 w-full rounded-xl bg-[#28563e] text-base font-semibold text-white shadow-sm hover:bg-[#204a35] sm:text-lg">Get discount</Button>
            <p className="mt-3 text-center text-xs leading-5 text-[#718073]">Email signup and checkout are not connected in this preview.</p>
            {giftSubmitted && <p role="status" className="mt-2 text-center text-sm font-medium text-[#28563e]">The welcome offer will be available when signup is enabled.</p>}
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
