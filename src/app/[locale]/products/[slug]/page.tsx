import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getProductBySlug, getProducts } from "@/lib/queries";
import { t as lt } from "@/lib/types";
import { ProductGallery } from "@/components/store/product-gallery";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { FaqAccordion } from "@/components/store/faq-accordion";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ Strength?: string | string[]; variant?: string | string[] }>;
};

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: `${lt(product.name, locale)} | Peptbay`, description: lt(product.description, locale) || lt(product.shortDescription, locale) };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const name = lt(product.name, locale);
  const variants = product.variants as (typeof product.variants[number] & { images?: string[]; description?: Record<string, string> })[];
  const variantParam = Array.isArray(query.variant) ? query.variant[0] : query.variant;
  const strengthParam = Array.isArray(query.Strength) ? query.Strength[0] : query.Strength;
  const slugVariant = product.slug === "retatrutide"
    ? slug.endsWith("-40mg") ? "RET40" : slug.endsWith("-20mg") ? "RET20" : undefined
    : product.slug === "tirzepatide" && slug.endsWith("-60mg") ? "TIR60" : undefined;
  const selectedVariant = variants.find((variant) => variant.sku === variantParam || variant.id === variantParam)
    ?? variants[Number(strengthParam) - 1]
    ?? variants.find((variant) => variant.sku === slugVariant)
    ?? variants[0];
  const images = selectedVariant?.images ?? product.images as string[];
  const description = lt(selectedVariant?.description ?? product.description, locale);
  const faqMap = product.faqs && typeof product.faqs === "object" ? product.faqs as Record<string, { q: string; a: string }[]> : {};
  const productFaqs = faqMap[locale] ?? faqMap.en ?? [];

  return (
    <div className="pb-v2"><div className="pb-wrap pt-8 md:pt-12">
      <nav className="mb-7 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" />
        <Link href="/shop" className="hover:text-foreground">Products</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="pb-pdp">
        <div className="pb-pdp-media"><ProductGallery key={`${slug}-${selectedVariant?.sku ?? "default"}`} images={images} name={name} /></div>
        <div className="pb-pdp-buy">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83907c]">{lt(product.category.name, locale)}</p>
          <h1 className="mt-5 text-primary">{name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{lt(product.shortDescription, locale)}</p>
          <div className="mt-6"><PurchasePanel key={selectedVariant?.sku ?? "default"} product={{ id: product.id, slug: product.slug, name, image: images[0] ?? "" }} variants={variants.map((variant) => ({ id: variant.id, sku: variant.sku, label: variant.label, concentration: variant.concentration, sizeMl: Number(variant.sizeMl), priceCents: variant.priceCents, stock: variant.stock }))} browseOnly={BROWSE_ONLY} /></div>
        </div>
      </div>
      <section className="pb-overview"><h2 className="pb-title">Product overview</h2><p className="text-xl leading-relaxed text-[#3e4c45]">{description}</p></section>
      <FaqAccordion eyebrow={locale === "es" ? "Preguntas del producto" : "Product questions"} title={locale === "es" ? `Preguntas sobre ${name}` : `Questions about ${name}`} faqs={productFaqs} />
    </div></div>
  );
}

export const revalidate = 300;
