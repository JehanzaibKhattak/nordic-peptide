"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { CURRENCY_NAMES, CURRENCY_SYMBOLS, DISPLAY_CURRENCIES } from "@/lib/money";
import { useCurrency } from "@/components/store/use-currency";

export function CurrencySwitcher() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { currency, setCurrency } = useCurrency();

  return (
    <details ref={detailsRef} className="relative">
      <summary aria-label={`Display currency: ${CURRENCY_NAMES[currency]}`} className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 text-sm text-[#294238] outline-none hover:bg-[#f0f0e8] focus-visible:ring-2 focus-visible:ring-[#315b43] [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">{CURRENCY_SYMBOLS[currency]}</span>
        <span>{currency}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-[#829083]" />
      </summary>
      <div role="group" aria-label="Choose display currency" className="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,32rem)] w-[min(17.5rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#d9d1c1] bg-[#fffdf8] p-1.5 text-[#193b2e] shadow-xl">
        {DISPLAY_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={currency === code}
            onClick={() => {
              setCurrency(code);
              detailsRef.current?.removeAttribute("open");
            }}
            className={`grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-[#f0f0e8] ${currency === code ? "bg-[#e9ede5] font-semibold" : ""}`}
          >
            <span className="font-semibold">{CURRENCY_SYMBOLS[code]}</span>
            <span>{CURRENCY_NAMES[code]}</span>
            <span className="text-[#7b8b73]">{code}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
