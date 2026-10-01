import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, ShieldCheck, Truck, CreditCard, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { ProductGrid } from "@/components/store/product-grid";
import { FaqAccordion } from "@/components/store/faq-accordion";
import { Markdown } from "@/components/store/markdown";
import { JsonLd } from "@/components/store/json-ld";
import { getProductBySlug, getProducts, getProductsByIds } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { toCard } from "@/lib/card";
import { t as lt, type Faq, type LocalizedFaqs, type ProductSpecs } from "@/lib/types";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return {
    title: lt(p.name, locale),
    description: lt(p.shortDescription, locale),
    alternates: { canonical: `/${locale}/products/${slug}` },
    openGraph: { images: [`/${locale}/products/${slug}/opengraph-image`] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [t, tCommon, product, settings] = await Promise.all([getTranslations("product"), getTranslations("common"), getProductBySlug(slug), getSettings()]);
  if (!product || !product.isActive) notFound();

  const name = lt(product.name, locale);
  const specs = product.specs as ProductSpecs;
  const images = product.images as string[];
  const faqs = ((product.faqs as LocalizedFaqs)[locale as "en"] ?? (product.faqs as LocalizedFaqs).en ?? []) as Faq[];
  const related = await getProductsByIds(product.relatedIds as string[]);
  const crossSell = (await getProducts()).filter((p) => p.form === "ACCESSORY" && p.id !== product.id).slice(0, 4);
  const lab = product.batchTests[0]?.labName ?? "Independent lab";
  const base = process.env.STORE_BASE_URL ?? "http://localhost:3000";

  const trustRows = [
    { icon: ShieldCheck, k: "tested" },
    { icon: Truck, k: "shipping" },
    { icon: CreditCard, k: "payment" },
    { icon: RotateCcw, k: "returns" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          sku: product.sku,
          description: lt(product.shortDescription, locale),
          image: images.map((i) => `${base}${i}`),
          brand: { "@type": "Brand", name: settings.brandName },
          offers: product.variants.map((v) => ({
            "@type": "Offer",
            sku: v.sku,
            name: v.label,
            price: (v.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${base}/${locale}/products/${product.slug}?variant=${v.label.replace(/\s/g, "").toLowerCase()}`,
          })),
          aggregateRating: { "@type": "AggregateRating", ratingValue: settings.reviewsRating, reviewCount: settings.reviewsCount },
        }}
      />
      {faqs.length > 0 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      )}

      <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{tCommon("home")}</Link>
        <ChevronRight className="size-3" />
        <Link href={`/shop/${product.category.slug}`} className="hover:text-foreground">{lt(product.category.name, locale)}</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
            <Image src={images[0]} alt={name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img) => (
                <div key={img} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                  <Image src={img} alt="" fill sizes="20vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-300 text-emerald-700">{t("inStock")}</Badge>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{lt(product.category.name, locale)}</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{name}</h1>
            <p className="mt-3 text-muted-foreground">{lt(product.shortDescription, locale)}</p>
          </div>

          {/* reads ?variant= via useSearchParams → needs a Suspense boundary for static prerender */}
          {BROWSE_ONLY ? (
            <p className="rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">{t("browseOnlyMessage")}</p>
          ) : (
            <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-secondary" />}>
              <PurchasePanel
                product={{ id: product.id, slug: product.slug, name, image: images[0], keyPeptides: specs.keyPeptides }}
                variants={product.variants.map((v) => ({ id: v.id, label: v.label, sizeMl: Number(v.sizeMl), priceCents: v.priceCents, stock: v.stock }))}
                labName={lab}
                reviews={{ rating: settings.reviewsRating, count: settings.reviewsCount }}
              />
            </Suspense>
          )}

          <Tabs defaultValue="ingredients">
            <TabsList className="w-full">
              <TabsTrigger value="ingredients" className="flex-1">{t("tabs.ingredients")}</TabsTrigger>
              <TabsTrigger value="use" className="flex-1">{t("tabs.howToUse")}</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">{t("tabs.details")}</TabsTrigger>
            </TabsList>
            <TabsContent value="ingredients" className="pt-4">
              <dl className="divide-y text-sm">
                <Row k={t("specs.keyPeptides")} v={specs.keyPeptides.join(", ") || "—"} />
                <Row k={t("specs.inci")} v={specs.inci} />
              </dl>
            </TabsContent>
            <TabsContent value="use" className="pt-4">
              <p className="text-sm">{specs.usage}</p>
              <Markdown className="mt-4">{lt(product.description, locale)}</Markdown>
            </TabsContent>
            <TabsContent value="details" className="pt-4">
              <dl className="divide-y text-sm">
                <Row k={t("specs.skinTypes")} v={specs.skinTypes.join(", ") || "—"} />
                <Row k={t("specs.texture")} v={specs.texture} />
                <Row k={t("specs.ph")} v={specs.ph} />
                <Row k={t("specs.pao")} v={specs.pao} />
                <Row k={t("specs.shelfLife")} v={specs.shelfLife} />
                <Row k={t("specs.sku")} v={product.sku} />
              </dl>
            </TabsContent>
          </Tabs>

          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {trustRows.map(({ icon: Icon, k }) => (
              <li key={k} className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t(`trustRows.${k}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-[2fr_1fr]">
        <FaqAccordion title={t("faq")} faqs={faqs} />
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("notice")}</aside>
      </div>

      {crossSell.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">{t("alsoNeed")}</h2>
          <ProductGrid products={crossSell.map(toCard)} categories={[]} filterable={false} />
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">{t("related")}</h2>
          <ProductGrid products={related.map(toCard)} categories={[]} filterable={false} />
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

// Catalogue is read from DB; refresh at most every 5 minutes (admin saves also revalidate).
export const revalidate = 300;
