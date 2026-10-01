import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { t as lt } from "@/lib/types";

type Cat = { slug: string; name: Record<string, string> };

export async function Footer({ categories, legalEntity }: { categories: Cat[]; legalEntity: string }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const legal = ["terms", "privacy", "shipping", "refunds", "cookies"] as const;

  return (
    <footer className="mt-20 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.shop")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/shop" className="hover:text-foreground">{t("home.all")}</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="hover:text-foreground">{lt(c.name, locale)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.info")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/testing" className="hover:text-foreground">{t("nav.testing")}</Link></li>
            <li><Link href="/journal" className="hover:text-foreground">{t("nav.journal")}</Link></li>
            <li><Link href="/legal/shipping" className="hover:text-foreground">{t("legal.shipping")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.legal")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {legal.map((p) => (
              <li key={p}>
                <Link href={`/legal/${p}`} className="hover:text-foreground">{t(`legal.${p}`)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/contact" className="hover:text-foreground">{t("nav.contact")}</Link></li>
          </ul>
          <p className="mt-6 text-xs font-medium">{t("footer.payments")}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((p) => (
              <span key={p} className="rounded border bg-background px-2 py-1">{p}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground">
          <p>{t("footer.disclaimer")}</p>
          <p>© {new Date().getFullYear()} {t("footer.company", { entity: legalEntity })}</p>
        </div>
      </div>
    </footer>
  );
}
