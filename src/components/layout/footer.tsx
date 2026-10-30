import { argentEnabled } from "@/lib/payments/argent-config";
import { connection } from "next/server";
import { guestBankCheckoutEnabled } from "@/lib/guest-checkout";
import Image from "next/image";
import { UK_ONLY_SHIPPING } from "@/config/shipping";
import { PaymentLogos } from "@/components/store/payment-logos";
import { getLocale } from "next-intl/server";
import { ArrowUpRight, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { t as lt } from "@/lib/types";

type Product = { sku: string; slug: string; name: Record<string, string>; variants: { label: string }[] };

export async function Footer({ products }: { products: Product[] }) {
  await connection();
  const locale = await getLocale();
  const bankOnly = guestBankCheckoutEnabled() && !argentEnabled();
  const sectionClass = "mb-4 text-sm font-semibold text-[#92aa99]";
  const linkClass = "transition-colors hover:text-white";

  return (
    <footer className="pb-store-footer relative overflow-hidden bg-[#10291f] text-[#e7eadf]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-14 lg:px-20 lg:py-14">
        <div>
          <p className="mt-6 max-w-xs text-sm leading-6 text-[#a6b5a6]">{UK_ONLY_SHIPPING ? "Peptbay. Peptides with third-party verification and batch documentation. Initial delivery within Great Britain via Royal Mail Tracked 24." : "Peptbay. Your source. Verified. Third-party tested peptides, shipped across Europe. Every product meets 99%+ purity and includes a full certificate of analysis. Discreet same-day dispatch on orders placed before 16:00 via PostNL and DHL."}</p>
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
            <li><Link href="/legal/privacy" className={linkClass}>Privacy Policy</Link></li>
            <li><Link href="/#faq" className={linkClass}>Catalogue questions</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-6 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-20">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">Contact</h2>
            <Link href="/contact" className="inline-flex items-center gap-2 text-sm text-[#c4cdc1] hover:text-white"><Mail aria-hidden="true" className="size-4" />Contact Peptbay</Link>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">Payment methods</h2>
            {bankOnly && <p className="mb-3 text-sm text-[#c4cdc1]">Bank Transfer · GBP</p>}
            <div className="flex flex-wrap gap-2" aria-label="Payment providers">
              <PaymentLogos methods={["Visa", "Mastercard", "PayPal", "Apple Pay", "Klarna", "iDEAL", "Bancontact"]} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-20"><Link href="/" aria-label="Peptbay home"><Image src="/v2/peptbay-logo-dark.svg" alt="Peptbay" width={2017} height={530} className="h-auto w-full" /></Link></div>
      <div className="border-t border-white/10">
        <p className="px-6 py-5 text-center text-xs text-[#879e8e]">© {new Date().getFullYear()} Peptbay</p>
      </div>
    </footer>
  );
}
