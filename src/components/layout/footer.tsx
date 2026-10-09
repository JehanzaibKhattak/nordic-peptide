import { getLocale } from "next-intl/server";
import { ArrowUpRight, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { t as lt } from "@/lib/types";

type Product = { sku: string; slug: string; name: Record<string, string>; variants: { label: string }[] };
const paymentMethods = ["Visa", "Mastercard", "PayPal", "Apple Pay", "Klarna", "iDEAL", "Bancontact"] as const;

function PaymentLogo({ name }: { name: (typeof paymentMethods)[number] }) {
  const widths: Record<(typeof paymentMethods)[number], string> = {
    Visa: "w-[5.25rem]", Mastercard: "w-12", PayPal: "w-12", "Apple Pay": "w-[4.25rem]", Klarna: "w-[3.5rem]", iDEAL: "w-12", Bancontact: "w-[3.75rem]",
  };
  return (
    <span role="img" aria-label={name} className={`flex h-8 shrink-0 items-center justify-center rounded-md bg-white px-1.5 shadow-sm ${widths[name]}`}>
      <svg aria-hidden="true" viewBox="0 0 84 34" className="h-6 w-full">
        {name === "Visa" && <text x="42" y="25" fill="#1434cb" fontFamily="Arial, sans-serif" fontSize="28" fontStyle="italic" fontWeight="900" textAnchor="middle">VISA</text>}
        {name === "Mastercard" && <><circle cx="36" cy="17" r="12" fill="#eb001b" /><circle cx="49" cy="17" r="12" fill="#f79e1b" /><path d="M42.5 7.1a12 12 0 0 1 0 19.8 12 12 0 0 1 0-19.8Z" fill="#ff5f00" /></>}
        {name === "PayPal" && <><path d="M31 7h13c7 0 10 4 9 10-1 7-6 10-13 10h-4l-1 5h-8l4-25Z" fill="#003087" /><path d="M38 11h12c6 0 9 3 8 9-1 6-5 9-12 9h-4l-1 4h-7l4-22Z" fill="#009cde" /></>}
        {name === "Apple Pay" && <><path d="M30 12c2-2 2-4 2-5-2 0-4 1-5 2-1 1-2 3-2 4 2 0 4 0 5-1Zm4 6c0-3 2-4 3-5-2-2-5-2-7-2-3 0-4 2-6 2-1 0-3-2-5-2-3 0-5 2-7 4-3 5 0 13 3 17 1 2 2 3 4 3 2 0 3-1 5-1s3 1 5 1c2 0 3-2 4-4 1-1 2-3 2-4-4-2-5-5-5-9Z" transform="translate(12 -2) scale(.7)" fill="#111" /><text x="57" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="600" textAnchor="middle">Pay</text></>}
        {name === "Klarna" && <><rect x="8" y="5" width="68" height="24" rx="12" fill="#ffb3c7" /><text x="42" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" textAnchor="middle">Klarna.</text></>}
        {name === "iDEAL" && <><circle cx="27" cy="17" r="12" fill="#e6005c" /><circle cx="27" cy="17" r="6" fill="white" /><path d="M27 11a6 6 0 0 1 0 12" fill="#1684c7" /><text x="55" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" textAnchor="middle">iDEAL</text></>}
        {name === "Bancontact" && <><path d="M14 10 39 6l-6 9-25 4z" fill="#009fe3" /><path d="m8 19 25-4 7 7-25 5z" fill="#f5c400" /><text x="59" y="20" fill="#173b2e" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle">BANCONTACT</text></>}
      </svg>
    </span>
  );
}

export async function Footer({ products }: { products: Product[] }) {
  const locale = await getLocale();
  const sectionClass = "mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]";
  const linkClass = "transition-colors hover:text-white";

  return (
    <footer className="mt-16 overflow-hidden rounded-t-[1.5rem] bg-[#173b2e] text-[#e7eadf]">
      <div className="mx-auto grid max-w-[1264px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-14 lg:px-8 lg:py-14">
        <div>
          <Link href="/" className="inline-flex flex-col leading-none">
            <span className="text-2xl font-semibold tracking-tight text-white">Avion-PEPT</span>
            <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#92aa99]">Peptide compounds &amp; blends</span>
          </Link>
          <p className="mt-6 max-w-xs font-serif text-base leading-6 text-[#a6b5a6]">Avion-PEPT Your source. Verified. Research-grade peptides, third-party verified and shipped to laboratories across Europe. Every product meets 99%+ purity and includes a full certificate of analysis. Discreet same-day dispatch on orders placed before 16:00 via PostNL and DHL. For research purposes only.</p>
        </div>

        <div>
          <h2 className={sectionClass}>Products</h2>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            {products.slice(0, 6).map((p) => <li key={p.sku}><Link href={`/products/${p.slug}`} className={linkClass}>{p.sku} · {lt(p.name, locale)}</Link></li>)}
            <li><Link href="/shop" className={`inline-flex items-center gap-1 ${linkClass}`}>View all products <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></li>
          </ul>
        </div>

        <div>
          <h2 className={sectionClass}>Company</h2>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            <li><Link href="/#commitment" className={linkClass}>Our commitment</Link></li>
            <li><Link href="/#faq" className={linkClass}>FAQ</Link></li>
            <li><Link href="/contact" className={linkClass}>Contact</Link></li>
          </ul>
        </div>

        <div>
          <h2 className={sectionClass}>Information</h2>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            <li><Link href="/testing" className={linkClass}>Batch documents</Link></li>
            <li><Link href="/#faq" className={linkClass}>Catalogue questions</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1264px] flex-col gap-7 px-6 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">Contact</h2>
            <Link href="/contact" className="inline-flex items-center gap-2 text-sm text-[#c4cdc1] hover:text-white"><Mail aria-hidden="true" className="size-4" />Contact Avion-PEPT</Link>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">Payment methods · preview</h2>
            <div className="flex flex-wrap gap-2" aria-label="Payment method logos shown for visual reference; checkout is disabled">
              {paymentMethods.map((method) => <PaymentLogo key={method} name={method} />)}
            </div>
            <p className="mt-2 text-[11px] text-[#a6b5a6]">Shown as a design reference; checkout is not enabled.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-4xl px-6 py-5 text-center text-xs leading-5 text-[#a6b5a6]">Disclaimer: The statements on this website have not been evaluated by the European Medicines Agency (EMA) or the U.S. Food and Drug Administration (FDA). The products offered by Avion-PEPT are for research purposes only and are not intended to diagnose, treat, cure, or prevent any disease.</p>
      </div>
      <div className="border-t border-white/10">
        <p className="px-6 py-5 text-center text-xs text-[#879e8e]">© {new Date().getFullYear()} Avion-PEPT</p>
      </div>
    </footer>
  );
}
