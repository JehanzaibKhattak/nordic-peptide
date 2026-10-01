import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { t as lt } from "@/lib/types";

type Cat = { slug: string; name: Record<string, string> };

const paymentMethods = ["Visa", "Mastercard", "PayPal", "Apple Pay", "Klarna", "iDEAL", "Bancontact"] as const;

function PaymentLogo({ name }: { name: (typeof paymentMethods)[number] }) {
  const widths: Record<(typeof paymentMethods)[number], string> = {
    Visa: "w-[5.25rem]",
    Mastercard: "w-12",
    PayPal: "w-12",
    "Apple Pay": "w-[4.25rem]",
    Klarna: "w-[3.5rem]",
    iDEAL: "w-12",
    Bancontact: "w-[3.75rem]",
  };
  const viewBoxes: Record<(typeof paymentMethods)[number], string> = {
    Visa: "0 0 84 34",
    Mastercard: "20 0 45 34",
    PayPal: "20 0 42 34",
    "Apple Pay": "15 0 55 34",
    Klarna: "0 0 84 34",
    iDEAL: "12 0 60 34",
    Bancontact: "5 0 75 34",
  };

  return (
    <span role="img" aria-label={name} className={`flex h-9 shrink-0 items-center justify-center rounded-md bg-white px-1.5 shadow-sm ${widths[name]}`}>
      <svg aria-hidden="true" viewBox={viewBoxes[name]} className="h-7 w-full">
        {name === "Visa" && <text x="42" y="25" fill="#1434cb" fontFamily="Arial, sans-serif" fontSize="28" fontStyle="italic" fontWeight="900" textAnchor="middle">VISA</text>}
        {name === "Mastercard" && <>
          <circle cx="36" cy="17" r="12" fill="#eb001b" />
          <circle cx="49" cy="17" r="12" fill="#f79e1b" fillOpacity=".95" />
          <path d="M42.5 7.1a12 12 0 0 1 0 19.8 12 12 0 0 1 0-19.8Z" fill="#ff5f00" />
        </>}
        {name === "PayPal" && <>
          <path d="M31 7h13c7 0 10 4 9 10-1 7-6 10-13 10h-4l-1 5h-8l4-25Z" fill="#003087" />
          <path d="M38 11h12c6 0 9 3 8 9-1 6-5 9-12 9h-4l-1 4h-7l4-22Z" fill="#009cde" />
        </>}
        {name === "Apple Pay" && <>
          <path d="M25 12c2-2 2-4 2-5-2 0-4 1-5 2-1 1-2 3-2 4 2 0 4 0 5-1Zm4 6c0-3 2-4 3-5-2-2-5-2-7-2-3 0-4 2-6 2-1 0-3-2-5-2-3 0-5 2-7 4-3 5 0 13 3 17 1 2 2 3 4 3 2 0 3-1 5-1s3 1 5 1c2 0 3-2 4-4 1-1 2-3 2-4-4-2-5-5-5-9Z" transform="translate(14 -2) scale(.7)" fill="#111" />
          <text x="53" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="600" textAnchor="middle">Pay</text>
        </>}
        {name === "Klarna" && <>
          <rect x="8" y="5" width="68" height="24" rx="12" fill="#ffb3c7" />
          <text x="42" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" textAnchor="middle">Klarna.</text>
        </>}
        {name === "iDEAL" && <>
          <circle cx="27" cy="17" r="12" fill="#e6005c" />
          <circle cx="27" cy="17" r="6" fill="white" />
          <path d="M27 11a6 6 0 0 1 0 12" fill="#1684c7" />
          <text x="53" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" textAnchor="middle">iDEAL</text>
        </>}
        {name === "Bancontact" && <>
          <path d="M14 10 39 6l-6 9-25 4z" fill="#009fe3" />
          <path d="m8 19 25-4 7 7-25 5z" fill="#f5c400" />
          <text x="59" y="20" fill="#173b2e" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle">BANCONTACT</text>
        </>}
      </svg>
    </span>
  );
}

export async function Footer({ categories, legalEntity }: { categories: Cat[]; legalEntity: string }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const legal = ["terms", "privacy", "shipping", "refunds"] as const;

  return (
    <footer className="mt-20 overflow-hidden rounded-t-[1.5rem] bg-[#173b2e] text-[#e7eadf]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-16 lg:px-8 lg:py-16">
        <div>
          <Link href="/" className="inline-flex flex-col leading-none">
            <span className="text-2xl font-semibold tracking-tight text-white">Avion-PEPT</span>
            <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#92aa99]">{t("brand.tagline")}</span>
          </Link>
          <p className="mt-7 max-w-xs font-serif text-base leading-6 text-[#a6b5a6]">{t("footer.about")}</p>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">{t("footer.shop")}</h3>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/shop/${c.slug}`} className="transition-colors hover:text-white">{lt(c.name, locale)}</Link></li>
            ))}
            <li><Link href="/shop" className="inline-flex items-center gap-1 transition-colors hover:text-white">{t("home.all")} <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">{t("footer.companyHeading")}</h3>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            <li><Link href="/testing" className="transition-colors hover:text-white">{t("nav.testing")}</Link></li>
            <li><Link href="/journal" className="transition-colors hover:text-white">{t("nav.journal")}</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-white">{t("nav.contact")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">{t("footer.legal")}</h3>
          <ul className="space-y-3 text-sm text-[#c4cdc1]">
            {legal.map((p) => (
              <li key={p}><Link href={`/legal/${p}`} className="transition-colors hover:text-white">{t(`legal.${p}`)}</Link></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">{t("footer.contact")}</h3>
            <Link href="/contact" className="inline-flex items-center gap-2 text-sm text-[#c4cdc1] transition-colors hover:text-white">
              <Mail aria-hidden="true" className="size-4" />{t("footer.contactUs")}
            </Link>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#92aa99]">{t("footer.payments")}</h3>
            <div className="flex flex-wrap gap-2" aria-label={t("footer.payments")}>
              {paymentMethods.map((method) => (
                <PaymentLogo key={method} name={method} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-4xl px-6 py-6 text-center text-xs leading-5 text-[#879e8e]">{t("footer.disclaimer")}</p>
      </div>
      <div className="border-t border-white/10">
        <p className="px-6 py-6 text-center text-xs text-[#879e8e]">© {new Date().getFullYear()} {t("footer.company", { entity: legalEntity })}</p>
      </div>
    </footer>
  );
}
